import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TarjetaMarcador } from "@/components/TarjetaMarcador";
import { crearMarcador } from "../fixtures/marcadores";

describe("TarjetaMarcador", () => {
  it("muestra un título con HTML como texto, sin interpretarlo", () => {
    const titulo = '<img src=x onerror="alert(1)">Título';
    const { container } = render(<TarjetaMarcador marcador={crearMarcador({ titulo })} />);

    expect(screen.getByRole("link", { name: /onerror/ })).toHaveTextContent(titulo);
    expect(container.querySelector("img[onerror]")).toBeNull();
  });

  it("enlaza al sitio en una pestaña nueva y lo anuncia", () => {
    render(<TarjetaMarcador marcador={crearMarcador()} />);
    const enlace = screen.getByRole("link", { name: /uso de fetch.*pestaña nueva/i });

    expect(enlace).toHaveAttribute("target", "_blank");
    expect(enlace).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("indica con texto (no solo color) un enlace roto y privado", () => {
    render(<TarjetaMarcador marcador={crearMarcador({ estado: "roto", publico: false })} />);

    expect(screen.getByText(/enlace roto/i)).toBeInTheDocument();
    expect(screen.getByText(/privado/i)).toBeInTheDocument();
  });
});
