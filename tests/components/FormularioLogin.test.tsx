import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/auth", () => auth);
vi.mock("@/lib/firebase-cliente", () => ({ obtenerAuthCliente: () => ({}) }));

import { FormularioLogin } from "@/components/FormularioLogin";
import { mensajeErrorAuth } from "@/schemas/login";

let fetchSimulado: ReturnType<typeof vi.fn>;
let asignar: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSimulado = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchSimulado);
  asignar = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign: asignar });
  auth.signInWithEmailAndPassword.mockResolvedValue({ user: { getIdToken: async () => "token-de-prueba" } });
  auth.createUserWithEmailAndPassword.mockResolvedValue({ user: { getIdToken: async () => "token-nuevo" } });
  auth.signOut.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("FormularioLogin", () => {
  it("valida el correo y la contraseña antes de llamar a Firebase", async () => {
    const usuario = userEvent.setup();
    render(<FormularioLogin siguiente="/" />);
    await usuario.type(screen.getByLabelText("Correo electrónico"), "no-es-correo");
    await usuario.type(screen.getByLabelText("Contraseña"), "123");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByLabelText("Correo electrónico")).toHaveAccessibleDescription(/correo válido/i);
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription(/al menos 6/i);
    expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
    expect(auth.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("cambia el idToken por la cookie de sesión, cierra el SDK y vuelve a la ruta pedida", async () => {
    const usuario = userEvent.setup();
    render(<FormularioLogin siguiente="/guardar" />);
    await usuario.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
    await usuario.type(screen.getByLabelText("Contraseña"), "secreta123");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    await vi.waitFor(() => expect(asignar).toHaveBeenCalledWith("/guardar"));
    const [ruta, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(ruta).toBe("/api/auth/sesion");
    expect(JSON.parse(String(opciones.body))).toEqual({ idToken: "token-de-prueba" });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("permite crear una cuenta", async () => {
    const usuario = userEvent.setup();
    render(<FormularioLogin siguiente="/" />);
    await usuario.click(screen.getByRole("button", { name: "Crea una" }));
    await usuario.type(screen.getByLabelText("Correo electrónico"), "beto@ejemplo.com");
    await usuario.type(screen.getByLabelText("Contraseña"), "secreta123");
    await usuario.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await vi.waitFor(() => expect(asignar).toHaveBeenCalledWith("/"));
    expect(auth.createUserWithEmailAndPassword).toHaveBeenCalled();
  });

  it("muestra en español el error de credenciales de Firebase", async () => {
    auth.signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    const usuario = userEvent.setup();
    render(<FormularioLogin siguiente="/" />);
    await usuario.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
    await usuario.type(screen.getByLabelText("Contraseña"), "equivocada");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("El correo o la contraseña no son correctos.")).toBeInTheDocument();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

describe("mensajeErrorAuth", () => {
  it("usa un mensaje genérico para códigos desconocidos", () => {
    expect(mensajeErrorAuth(new Error("x"))).toMatch(/no pudimos iniciar sesión/i);
  });
});
