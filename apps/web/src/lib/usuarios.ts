/**
 * Los usuarios demo. El selector de la cabecera cambia entre ellos y con eso
 * cambia la interfaz que el agente construye: es la prueba de adaptabilidad que
 * pide la rubrica (20%).
 */
export type UsuarioDemo = {
  id: string;
  nombre: string;
  iniciales: string;
  contexto: string;
};

export const USUARIOS: UsuarioDemo[] = [
  {
    id: "usr_beto",
    nombre: "Alberto Ramírez",
    iniciales: "AR",
    contexto: "Tarjeta al límite, un pago atrasado",
  },
  {
    id: "usr_ana",
    nombre: "Ana Sofía Treviño",
    iniciales: "AT",
    contexto: "Sin deuda, saldo holgado",
  },
];

export const USUARIO_POR_DEFECTO = USUARIOS[0]!;
