import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListaMarcadores } from "@/components/ListaMarcadores";
import { MARCADORES_PRUEBA } from "../fixtures/marcadores";

const SIN_BUSQUEDA = { q: "", etiqueta: null };

/** Respuesta paginada de la API. */
function pagina(items: unknown[], siguienteCursor: string | null = null): { items: unknown[]; siguienteCursor: string | null } {
  return { items, siguienteCursor };
}

/** Simula fetch con una respuesta JSON. */
function simularFetch(cuerpo: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fetchSimulado = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchSimulado);
  return fetchSimulado;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ListaMarcadores", () => {
  it("muestra la carga y luego una tarjeta por marcador", async () => {
    simularFetch(pagina(MARCADORES_PRUEBA));
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    expect(screen.getByText("Cargando marcadores…")).toBeInTheDocument();
    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 3, name: /uso de fetch/i })).toBeInTheDocument();
  });

  it("filtra al escribir en el buscador y actualiza la URL", async () => {
    simularFetch(pagina(MARCADORES_PRUEBA));
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);
    await screen.findAllByRole("article");

    await usuario.type(screen.getByRole("searchbox", { name: "Buscar marcadores" }), "metricas");

    expect(await screen.findByText("1 de 3 marcadores coinciden con la búsqueda")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(window.location.search).toBe("?q=metricas");
  });

  it("filtra por etiqueta e indica el botón activo con aria-pressed", async () => {
    simularFetch(pagina(MARCADORES_PRUEBA));
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);
    await screen.findAllByRole("article");

    const filtro = screen.getByRole("group", { name: "Filtrar por etiqueta" });
    const boton = within(filtro).getByRole("button", { name: /#seguridad/ });
    await usuario.click(boton);

    expect(boton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("muestra el estado vacío y permite limpiar los filtros", async () => {
    simularFetch(pagina(MARCADORES_PRUEBA));
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={{ q: "no-existe-nada", etiqueta: null }} />);

    expect(await screen.findByText("Ningún marcador coincide con la búsqueda.")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(await screen.findAllByRole("article")).toHaveLength(3);
  });

  it("muestra un error con reintento si la carga falla", async () => {
    const fetchSimulado = simularFetch({ error: "falla" }, 500);
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("No pudimos cargar tus marcadores.");

    fetchSimulado.mockResolvedValue(new Response(JSON.stringify(pagina(MARCADORES_PRUEBA)), { status: 200 }));
    await usuario.click(within(alerta).getByRole("button", { name: "Reintentar" }));

    expect(await screen.findAllByRole("article")).toHaveLength(3);
  });

  it("rechaza datos con formato inválido", async () => {
    simularFetch(pagina([{ id: "x", url: "javascript:alert(1)" }]));
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("no tiene el formato esperado");
  });

  it("con etiqueta fija muestra solo esa etiqueta, oculta el filtro y no la pone en la URL", async () => {
    simularFetch(pagina(MARCADORES_PRUEBA));
    render(<ListaMarcadores busquedaInicial={{ q: "", etiqueta: "javascript" }} etiquetaFija="javascript" />);

    expect(await screen.findAllByRole("article")).toHaveLength(2);
    expect(screen.queryByRole("group", { name: "Filtrar por etiqueta" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("pide la lista a la API con la cookie de sesión", async () => {
    const fetchSimulado = simularFetch(pagina(MARCADORES_PRUEBA));
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);
    await screen.findAllByRole("article");

    const [ruta, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(ruta).toBe("/api/marcadores?limite=100");
    expect(opciones.credentials).toBe("same-origin");
  });

  it("carga la siguiente página con el cursor", async () => {
    const fetchSimulado = simularFetch(pagina(MARCADORES_PRUEBA.slice(0, 2), "c".repeat(64)));
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);
    expect(await screen.findAllByRole("article")).toHaveLength(2);

    fetchSimulado.mockResolvedValue(new Response(JSON.stringify(pagina(MARCADORES_PRUEBA.slice(2))), { status: 200 }));
    await usuario.click(screen.getByRole("button", { name: "Cargar más marcadores" }));

    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(fetchSimulado.mock.calls[1]?.[0]).toBe(`/api/marcadores?limite=100&cursor=${"c".repeat(64)}`);
    expect(screen.queryByRole("button", { name: "Cargar más marcadores" })).not.toBeInTheDocument();
  });

  it("elimina con actualización optimista y la tarjeta vuelve si la API falla", async () => {
    const fetchSimulado = simularFetch(pagina(MARCADORES_PRUEBA));
    vi.stubGlobal("confirm", () => true);
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);
    await screen.findAllByRole("article");

    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }));
    await usuario.click(screen.getByRole("button", { name: /eliminar.*uso de fetch/i }));
    await vi.waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(fetchSimulado).toHaveBeenLastCalledWith("/api/marcadores/m1", expect.objectContaining({ method: "DELETE" }));

    fetchSimulado.mockResolvedValue(new Response(JSON.stringify({ error: "Falla" }), { status: 500 }));
    await usuario.click(screen.getByRole("button", { name: /eliminar.*métricas web esenciales/i }));
    expect(await screen.findByText(/no se pudo eliminar «métricas web esenciales»/i)).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("muestra el error de validación junto al campo", async () => {
    simularFetch(pagina(MARCADORES_PRUEBA));
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    const campo = screen.getByRole("searchbox", { name: "Buscar marcadores" });
    await usuario.click(campo);
    await usuario.paste("a".repeat(101));

    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(/máximo 100 caracteres/);
  });
});
