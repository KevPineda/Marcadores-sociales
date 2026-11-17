import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioGuardar } from "@/components/FormularioGuardar";
import { leerMarcadoresLocales } from "@/lib/almacen-local";
import { crearMarcador } from "../fixtures/marcadores";

const EXISTENTE = crearMarcador({ id: "zod", url: "https://zod.dev/", titulo: "Zod" });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => new Response(JSON.stringify([EXISTENTE]), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renderiza el formulario y espera a que carguen los marcadores existentes. */
async function renderizar(): Promise<ReturnType<typeof userEvent.setup>> {
  const usuario = userEvent.setup();
  render(<FormularioGuardar />);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  return usuario;
}

describe("FormularioGuardar", () => {
  it("sin enlace muestra el error junto al campo y le pasa el foco", async () => {
    const usuario = await renderizar();
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    const campo = screen.getByRole("textbox", { name: "Enlace" });
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(/escribe o pega un enlace/i);
    expect(campo).toHaveFocus();
  });

  it("criterio 1: rechaza http://169.254.169.254/", async () => {
    const usuario = await renderizar();
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "http://169.254.169.254/");
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    expect(screen.getByRole("textbox", { name: "Enlace" })).toHaveAccessibleDescription(/internas o locales/);
    expect(leerMarcadoresLocales()).toHaveLength(0);
  });

  it("criterio 4: detecta un duplicado aunque traiga parámetros utm_*", async () => {
    const usuario = await renderizar();
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "https://zod.dev/?utm_source=boletin");
    expect(await screen.findByText("https://zod.dev/")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    expect(screen.getByRole("textbox", { name: "Enlace" })).toHaveAccessibleDescription(/ya guardaste este enlace/i);
    expect(leerMarcadoresLocales()).toHaveLength(0);
  });

  it("guarda un enlace válido normalizado con sus etiquetas y visibilidad", async () => {
    const usuario = await renderizar();
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "https://web.dev/vitals?utm_source=x#lcp");
    await usuario.type(screen.getByRole("textbox", { name: /título/i }), "Web Vitals");
    await usuario.type(screen.getByRole("textbox", { name: /etiquetas/i }), "Rendimiento, web-vitals");
    await usuario.click(screen.getByRole("radio", { name: /público/i }));
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Enlace guardado: «Web Vitals»");
    const [guardado] = leerMarcadoresLocales();
    expect(guardado).toMatchObject({
      url: "https://web.dev/vitals",
      titulo: "Web Vitals",
      etiquetas: ["rendimiento", "web-vitals"],
      publico: true,
    });
    expect(screen.getByRole("textbox", { name: "Enlace" })).toHaveValue("");
  });

  it("el botón «Pegar enlace» solo aparece si el navegador permite leer el portapapeles", async () => {
    await renderizar();
    const hayPortapapeles = typeof navigator.clipboard?.readText === "function";
    expect(screen.queryByRole("button", { name: "Pegar enlace" }) !== null).toBe(hayPortapapeles);
  });
});
