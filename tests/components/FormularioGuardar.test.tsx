import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioGuardar } from "@/components/FormularioGuardar";
import { crearMarcador } from "../fixtures/marcadores";

let fetchSimulado: ReturnType<typeof vi.fn>;

/** Respuesta JSON de la API. */
function respuesta(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FormularioGuardar", () => {
  it("sin enlace muestra el error junto al campo, le pasa el foco y no llama a la API", async () => {
    const usuario = userEvent.setup();
    render(<FormularioGuardar />);
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    const campo = screen.getByRole("textbox", { name: "Enlace" });
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(/escribe o pega un enlace/i);
    expect(campo).toHaveFocus();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("criterio 1: rechaza http://169.254.169.254/ sin llamar a la API", async () => {
    const usuario = userEvent.setup();
    render(<FormularioGuardar />);
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "http://169.254.169.254/");
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    expect(screen.getByRole("textbox", { name: "Enlace" })).toHaveAccessibleDescription(/internas o locales/);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("criterio 4: muestra el 409 de la API como error del campo enlace", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ error: "Ya guardaste este enlace." }, 409));
    const usuario = userEvent.setup();
    render(<FormularioGuardar />);
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "https://zod.dev/?utm_source=boletin");
    expect(await screen.findByText("https://zod.dev/")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    const campo = screen.getByRole("textbox", { name: "Enlace" });
    await vi.waitFor(() => expect(campo).toHaveAccessibleDescription(/ya guardaste este enlace/i));
  });

  it("envía a la API los datos validados y muestra el marcador guardado", async () => {
    const guardado = crearMarcador({ url: "https://web.dev/vitals", titulo: "Web Vitals", etiquetas: ["rendimiento"] });
    fetchSimulado.mockResolvedValue(respuesta(guardado, 201));
    const usuario = userEvent.setup();
    render(<FormularioGuardar />);
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "https://web.dev/vitals?utm_source=x#lcp");
    await usuario.type(screen.getByRole("textbox", { name: /título/i }), "Web Vitals");
    await usuario.type(screen.getByRole("textbox", { name: /etiquetas/i }), "Rendimiento, web-vitals");
    await usuario.click(screen.getByRole("radio", { name: /público/i }));
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    expect(await screen.findByText(/Enlace guardado: «Web Vitals»/)).toBeInTheDocument();
    const [ruta, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(ruta).toBe("/api/marcadores");
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(String(opciones.body))).toEqual({
      url: "https://web.dev/vitals?utm_source=x#lcp",
      titulo: "Web Vitals",
      etiquetas: ["rendimiento", "web-vitals"],
      publico: true,
    });
    expect(screen.getByRole("textbox", { name: "Enlace" })).toHaveValue("");
  });

  it("muestra junto al campo los detalles de un 400 de la API", async () => {
    fetchSimulado.mockResolvedValue(
      respuesta({ error: "Datos inválidos.", detalles: [{ campo: "titulo", mensaje: "Título no permitido." }] }, 400),
    );
    const usuario = userEvent.setup();
    render(<FormularioGuardar />);
    await usuario.type(screen.getByRole("textbox", { name: "Enlace" }), "https://zod.dev/");
    await usuario.click(screen.getByRole("button", { name: "Guardar enlace" }));

    const titulo = screen.getByRole("textbox", { name: /título/i });
    await vi.waitFor(() => expect(titulo).toHaveAccessibleDescription(/título no permitido/i));
    expect(titulo).toHaveFocus();
  });

  it("el botón «Pegar enlace» solo aparece si el navegador permite leer el portapapeles", () => {
    render(<FormularioGuardar />);
    const hayPortapapeles = typeof navigator.clipboard?.readText === "function";
    expect(screen.queryByRole("button", { name: "Pegar enlace" }) !== null).toBe(hayPortapapeles);
  });
});
