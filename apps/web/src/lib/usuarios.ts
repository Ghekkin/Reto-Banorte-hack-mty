/**
 * Los usuarios demo. El selector de la cabecera cambia entre ellos y con eso
 * cambia la interfaz que el agente construye: es la prueba de adaptabilidad que
 * pide la rubrica (20%).
 *
 * Son TRES desde el 2026-09-12 (enmienda al ADR 0004): Carmen sostiene el escenario
 * de inversiones y el angulo de ejecutivo de cuenta, que es una audiencia distinta al
 * usuario retail. Los ids coinciden con `la base/usuarios.csv`.
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
    contexto: "Sin deuda, sin fondo de emergencia",
  },
  {
    id: "usr_carmen",
    nombre: "Carmen Elizondo",
    iniciales: "CE",
    contexto: "Patrimonial, con portafolio",
  },
];

export const USUARIO_POR_DEFECTO = USUARIOS[0]!;

export function usuarioPorId(id: string): UsuarioDemo {
  return USUARIOS.find((u) => u.id === id) ?? USUARIO_POR_DEFECTO;
}
