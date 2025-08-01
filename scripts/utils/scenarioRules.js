// scripts/utils/scenarioRules.js

/**
 * Define as regras, pontos e descrições para cada tipo de campanha disponível no wizard.
 * Esta estrutura centraliza as configurações e facilita a adição de novos cenários no futuro.
 */
export const DAEMON_WIZARD_SCENARIOS = {
  "fantasia-medieval": {
    label: "Fantasia Medieval",
    description: "Um mundo de espadas, magia e criaturas fantásticas. Heróis se aventuram em masmorras e reinos em busca de glória e tesouros.",
    points: {
      attributes: 80,
      aprimoramentos: 5, 
    },
  },
  "terror-contemporaneo": {
    label: "Terror Contemporâneo",
    description: "O mundo moderno esconde horrores indizíveis nas sombras. Investigadores comuns enfrentam cultos profanos e monstros de outras realidades.",
    points: {
      attributes: 75,
      aprimoramentos: 5,
    },
  },
  "cyberpunk": {
    label: "Cyberpunk",
    description: "Em um futuro distópico, a alta tecnologia e a miséria coexistem. Corporações gigantes controlam o mundo, e mercenários com implantes cibernéticos lutam para sobreviver.",
    points: {
        attributes: 100,
        aprimoramentos: 5,
    },
  }
};
