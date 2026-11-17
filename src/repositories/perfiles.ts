import "server-only";
import { errorConflicto } from "@/lib/errores";
import { obtenerFirestore } from "@/lib/firebase-admin";

/** uid del dueño de un nombre público (perfilesPublicos/{nombre}), o null. */
export async function obtenerUidDePerfil(nombre: string): Promise<string | null> {
  const documento = await obtenerFirestore().collection("perfilesPublicos").doc(nombre).get();
  const uid = documento.get("uid");
  return typeof uid === "string" ? uid : null;
}

/** Nombre público del usuario (usuarios/{uid}.nombrePublico), o null. */
export async function obtenerNombreDeUsuario(uid: string): Promise<string | null> {
  const documento = await obtenerFirestore().collection("usuarios").doc(uid).get();
  const nombre = documento.get("nombrePublico");
  return typeof nombre === "string" ? nombre : null;
}

/**
 * Reserva un nombre público único en una transacción (todas las lecturas antes
 * de las escrituras). 409 si el nombre está ocupado o el usuario ya tiene uno.
 */
export async function reservarNombre(uid: string, nombre: string, creadoEn: string): Promise<void> {
  const db = obtenerFirestore();
  const refUsuario = db.collection("usuarios").doc(uid);
  const refPerfil = db.collection("perfilesPublicos").doc(nombre);

  await db.runTransaction(async (transaccion) => {
    const [usuario, perfil] = await transaccion.getAll(refUsuario, refPerfil);
    if (typeof usuario.get("nombrePublico") === "string") {
      throw errorConflicto("Ya tienes un nombre público.");
    }
    if (perfil.exists) {
      throw errorConflicto("Ese nombre ya está en uso.");
    }
    transaccion.create(refPerfil, { uid, creadoEn });
    transaccion.set(refUsuario, { nombrePublico: nombre }, { merge: true });
  });
}
