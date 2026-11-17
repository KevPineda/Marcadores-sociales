import "server-only";
import type { CollectionReference, DocumentSnapshot, Query } from "firebase-admin/firestore";
import { ErrorApi, errorConflicto, errorNoEncontrado } from "@/lib/errores";
import { obtenerFirestore } from "@/lib/firebase-admin";
import type { CambiosMarcador, ConsultaMarcadores, Pagina, Paginacion } from "@/schemas/api";
import { marcadorSchema, type Marcador } from "@/schemas/marcador";

/** Códigos gRPC de Firestore. */
const YA_EXISTE = 6;
const NO_ENCONTRADO = 5;

/** Máximo de operaciones por lote de Firestore. */
const TAMANO_LOTE = 500;

/** Documento guardado: el marcador sin id + fecha de la última revisión del enlace. */
type DocumentoMarcador = Omit<Marcador, "id"> & { revisadoEn: string };

export type PendienteRevision = { ruta: string; url: string };

/** usuarios/{uid}/marcadores */
function coleccion(uid: string): CollectionReference {
  return obtenerFirestore().collection("usuarios").doc(uid).collection("marcadores");
}

/** Indica si el error de Firestore tiene el código gRPC indicado. */
function tieneCodigo(error: unknown, codigo: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === codigo;
}

/** Convierte un documento en Marcador (valida la forma y descarta campos internos). */
function aMarcador(documento: DocumentSnapshot): Marcador {
  const datos: Record<string, unknown> = { ...documento.data() };
  delete datos.revisadoEn;
  return marcadorSchema.parse({ id: documento.id, ...datos });
}

/** Ejecuta una consulta paginada por cursor (id del último documento de la página anterior). */
async function paginar(
  consulta: Query,
  referencias: CollectionReference,
  { limite, cursor }: Paginacion,
): Promise<Pagina<Marcador>> {
  let pagina = consulta;
  if (cursor) {
    const ultimo = await referencias.doc(cursor).get();
    if (!ultimo.exists) {
      throw new ErrorApi(400, "Los datos enviados no son válidos.", [
        { campo: "cursor", mensaje: "El cursor no es válido." },
      ]);
    }
    pagina = pagina.startAfter(ultimo);
  }

  const resultado = await pagina.limit(limite + 1).get();
  const documentos = resultado.docs.slice(0, limite);
  const hayMas = resultado.docs.length > limite;
  return {
    items: documentos.map(aMarcador),
    siguienteCursor: hayMas ? documentos[documentos.length - 1].id : null,
  };
}

/** Indica si el usuario ya tiene un marcador con ese id. */
export async function existeMarcador(uid: string, id: string): Promise<boolean> {
  return (await coleccion(uid).doc(id).get()).exists;
}

/** Marcador del usuario, o null si no existe. */
export async function obtenerMarcador(uid: string, id: string): Promise<Marcador | null> {
  const documento = await coleccion(uid).doc(id).get();
  return documento.exists ? aMarcador(documento) : null;
}

/** Crea el marcador; si el id (hash de la URL) ya existe → 409. */
export async function crearMarcador(uid: string, marcador: Marcador): Promise<void> {
  const { id, ...datos } = marcador;
  const documento: DocumentoMarcador = { ...datos, revisadoEn: marcador.creadoEn };
  try {
    await coleccion(uid).doc(id).create(documento);
  } catch (error) {
    if (tieneCodigo(error, YA_EXISTE)) {
      throw errorConflicto("Ya guardaste este enlace.");
    }
    throw error;
  }
}

/** Lista los marcadores del usuario, del más reciente al más antiguo. */
export async function listarMarcadores(uid: string, consulta: ConsultaMarcadores): Promise<Pagina<Marcador>> {
  const referencias = coleccion(uid);
  const base = consulta.etiqueta ? referencias.where("etiquetas", "array-contains", consulta.etiqueta) : referencias;
  return paginar(base.orderBy("creadoEn", "desc"), referencias, consulta);
}

/** Lista solo los marcadores públicos del usuario. */
export async function listarMarcadoresPublicos(uid: string, paginacion: Paginacion): Promise<Pagina<Marcador>> {
  const referencias = coleccion(uid);
  const consulta = referencias.where("publico", "==", true).orderBy("creadoEn", "desc");
  return paginar(consulta, referencias, paginacion);
}

/** Todos los marcadores del usuario (para exportar). */
export async function listarTodosLosMarcadores(uid: string): Promise<Marcador[]> {
  const resultado = await coleccion(uid).orderBy("creadoEn", "desc").get();
  return resultado.docs.map(aMarcador);
}

/** Actualiza campos editables; 404 si no existe. */
export async function actualizarMarcador(uid: string, id: string, cambios: CambiosMarcador): Promise<void> {
  try {
    await coleccion(uid).doc(id).update(cambios);
  } catch (error) {
    if (tieneCodigo(error, NO_ENCONTRADO)) {
      throw errorNoEncontrado("No encontramos ese marcador.");
    }
    throw error;
  }
}

/** Elimina el marcador; 404 si no existe. */
export async function eliminarMarcador(uid: string, id: string): Promise<void> {
  const referencia = coleccion(uid).doc(id);
  if (!(await referencia.get()).exists) {
    throw errorNoEncontrado("No encontramos ese marcador.");
  }
  await referencia.delete();
}

/** Crea varios marcadores omitiendo los que ya existen. Devuelve cuántos se crearon. */
export async function crearVariosMarcadores(uid: string, marcadores: Marcador[]): Promise<number> {
  const db = obtenerFirestore();
  const referencias = coleccion(uid);
  let creados = 0;

  for (let inicio = 0; inicio < marcadores.length; inicio += TAMANO_LOTE) {
    const grupo = marcadores.slice(inicio, inicio + TAMANO_LOTE);
    const existentes = await db.getAll(...grupo.map((marcador) => referencias.doc(marcador.id)));
    const lote = db.batch();
    for (const [indice, marcador] of grupo.entries()) {
      if (existentes[indice].exists) {
        continue;
      }
      const { id, ...datos } = marcador;
      const documento: DocumentoMarcador = { ...datos, revisadoEn: marcador.creadoEn };
      lote.create(referencias.doc(id), documento);
      creados += 1;
    }
    await lote.commit();
  }
  return creados;
}

/** Marcadores (de todos los usuarios) revisados hace más tiempo. */
export async function listarPendientesDeRevision(limite: number): Promise<PendienteRevision[]> {
  const resultado = await obtenerFirestore()
    .collectionGroup("marcadores")
    .orderBy("revisadoEn", "asc")
    .limit(limite)
    .get();
  const pendientes: PendienteRevision[] = [];
  for (const documento of resultado.docs) {
    pendientes.push({ ruta: documento.ref.path, url: String(documento.get("url")) });
  }
  return pendientes;
}

/** Guarda el resultado de revisar un enlace. */
export async function guardarRevision(ruta: string, estado: Marcador["estado"], revisadoEn: string): Promise<void> {
  await obtenerFirestore().doc(ruta).update({ estado, revisadoEn });
}
