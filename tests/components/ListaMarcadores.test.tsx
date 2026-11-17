import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListaMarcadores } from "@/components/ListaMarcadores";
import { MARCADORES_PRUEBA } from "../fixtures/marcadores";

const SIN_BUSQUEDA = { q: "", etiqueta: null };

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
    simularFetch(MARCADORES_PRUEBA);
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    expect(screen.getByText("Cargando marcadores…")).toBeInTheDocument();
    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 3, name: /uso de fetch/i })).toBeInTheDocument();
  });

  it("filtra al escribir en el buscador y actualiza la URL", async () => {
    simularFetch(MARCADORES_PRUEBA);
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);
    await screen.findAllByRole("article");

    await usuario.type(screen.getByRole("searchbox", { name: "Buscar marcadores" }), "metricas");

    expect(await screen.findByText("1 de 3 marcadores coinciden con la búsqueda")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(window.location.search).toBe("?q=metricas");
  });

  it("filtra por etiqueta e indica el botón activo con aria-pressed", async () => {
    simularFetch(MARCADORES_PRUEBA);
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
    simularFetch(MARCADORES_PRUEBA);
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

    fetchSimulado.mockResolvedValue(new Response(JSON.stringify(MARCADORES_PRUEBA), { status: 200 }));
    await usuario.click(within(alerta).getByRole("button", { name: "Reintentar" }));

    expect(await screen.findAllByRole("article")).toHaveLength(3);
  });

  it("rechaza datos con formato inválido", async () => {
    simularFetch([{ id: "x", url: "javascript:alert(1)" }]);
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("no tienen el formato esperado");
  });

  it("muestra el error de validación junto al campo", async () => {
    simularFetch(MARCADORES_PRUEBA);
    const usuario = userEvent.setup();
    render(<ListaMarcadores busquedaInicial={SIN_BUSQUEDA} />);

    const campo = screen.getByRole("searchbox", { name: "Buscar marcadores" });
    await usuario.click(campo);
    await usuario.paste("a".repeat(101));

    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(/máximo 100 caracteres/);
  });
});
