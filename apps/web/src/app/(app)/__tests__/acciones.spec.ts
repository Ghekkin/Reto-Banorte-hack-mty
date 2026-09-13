import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarUsuario } from "@/app/(app)/acciones";
import { COOKIE_USUARIO } from "@/lib/usuario-activo";

const galletaSet = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    set: galletaSet,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("cambiarUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("con un usuario valido: escribe la cookie, revalida layout y redirige a inicio", async () => {
    await expect(cambiarUsuario("usr_ana")).rejects.toThrow("NEXT_REDIRECT");

    expect(galletaSet).toHaveBeenCalledWith(
      COOKIE_USUARIO,
      "usr_ana",
      expect.objectContaining({
        path: "/",
        sameSite: "lax",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("con un usuario invalido: no hace nada y no redirige", async () => {
    await cambiarUsuario("usuario_fantasma");

    expect(galletaSet).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
