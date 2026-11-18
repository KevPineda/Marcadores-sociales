import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanelCuenta } from "@/components/PanelCuenta";

/** Simula /api/auth/yo con el rol indicado y la revisión manual. */
function simular(rol: "usuario" | "admin"): ReturnType<typeof vi.fn> {
  const fetchSimulado = vi.fn(async (ruta: string) =>
    ruta === "/api/auth/yo"
      ? new Response(JSON.stringify({ usuario: { uid: "u1", correo: "ana@ejemplo.com", rol } }), { status: 200 })
      : new Response(JSON.stringify({ revisados: 7, rotos: 2 }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchSimulado);
  return fetchSimulado;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PanelCuenta", () => {
  it("un usuario normal ve su rol y no ve acciones de administrador", async () => {
    simular("usuario");
    render(<PanelCuenta />);
    expect(await screen.findByText("Usuario")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revisar enlaces/i })).not.toBeInTheDocument();
  });

  it("un administrador puede lanzar la revisión de enlaces rotos", async () => {
    const fetchSimulado = simular("admin");
    const usuario = userEvent.setup();
    render(<PanelCuenta />);
    await usuario.click(await screen.findByRole("button", { name: "Revisar enlaces rotos ahora" }));

    expect(await screen.findByText("Listo: se revisaron 7 enlaces y 2 están rotos.")).toBeInTheDocument();
    expect(fetchSimulado).toHaveBeenLastCalledWith("/api/cron/revisar-enlaces", expect.objectContaining({ method: "POST" }));
  });
});
