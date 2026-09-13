import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import {
  COOKIE_DISPOSITIVO,
  DISPOSITIVO_COMUN,
  DISPOSITIVO_SIN_ACCIONES,
  dispositivoDeCookie,
  dispositivoParaRegistro,
  esIdDeDispositivo,
  nuevoIdDeDispositivo,
} from "../dispositivo";

/**
 * La identidad del dispositivo (ADR 0012): cada navegador recibe la suya en la primera
 * visita, la conserva, y lo que no sea un id nuestro cae al estado comun.
 */
describe("el id del dispositivo", () => {
  it("se genera valido y distinto cada vez", () => {
    const a = nuevoIdDeDispositivo();
    const b = nuevoIdDeDispositivo();
    expect(esIdDeDispositivo(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("el ambito compartido sin acciones no lo puede adoptar ningun navegador", () => {
    expect(esIdDeDispositivo(DISPOSITIVO_SIN_ACCIONES)).toBe(false);
    expect(dispositivoDeCookie(DISPOSITIVO_SIN_ACCIONES)).toBe(DISPOSITIVO_COMUN);
    // Pero cumple el patron del MCP, para que la portada se arme con un estado sin acciones.
    expect(/^dis_[a-z0-9]{12,40}$/.test(DISPOSITIVO_SIN_ACCIONES)).toBe(true);
  });

  it("lo que no es un id nuestro es el estado comun", () => {
    expect(dispositivoDeCookie(undefined)).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoDeCookie("comun")).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoDeCookie("dis_x")).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoDeCookie("dis_ABCDEF0123456789")).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoDeCookie("dis_abcdef0123456789")).toBe("dis_abcdef0123456789");
    expect(dispositivoParaRegistro(DISPOSITIVO_COMUN)).toBeNull();
  });
});

describe("proxy", () => {
  it("en la primera visita pone la cookie en la respuesta Y en la peticion que sigue a la pagina", () => {
    const respuesta = proxy(new NextRequest("http://localhost:3000/"));

    const puesta = respuesta.cookies.get(COOKIE_DISPOSITIVO);
    expect(esIdDeDispositivo(puesta?.value)).toBe(true);
    expect(puesta?.httpOnly).toBe(true);
    // Next reenvia a la pagina las cabeceras de la peticion modificada: asi el primer render
    // ya lee la portada de ESTE dispositivo y no la comun.
    expect(respuesta.headers.get("x-middleware-request-cookie")).toContain(`${COOKIE_DISPOSITIVO}=${puesta?.value}`);
  });

  it("con cookie valida no la cambia: el dispositivo se conserva entre visitas", () => {
    const peticion = new NextRequest("http://localhost:3000/maya", {
      headers: { cookie: `${COOKIE_DISPOSITIVO}=dis_abcdef0123456789` },
    });
    const respuesta = proxy(peticion);
    expect(respuesta.cookies.get(COOKIE_DISPOSITIVO)).toBeUndefined();
  });
});
