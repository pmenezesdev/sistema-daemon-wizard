export const registerSettings = () => {
  game.settings.register('sistema-daemon-wizard', 'attributePoints', {
    name: game.i18n.localize('DAEMON_WIZARD.Settings.AttributePoints'),
    hint: game.i18n.localize('DAEMON_WIZARD.Settings.AttributePointsHint'),
    scope: 'world',
    config: true,
    type: Number,
    default: 0
  });

  game.settings.register('sistema-daemon-wizard', 'aprimoramentoPositivePoints', {
    name: game.i18n.localize('DAEMON_WIZARD.Settings.PositiveAprimoramentos'),
    hint: game.i18n.localize('DAEMON_WIZARD.Settings.PositiveAprimoramentosHint'),
    scope: 'world',
    config: true,
    type: Number,
    default: 0
  });

  game.settings.register('sistema-daemon-wizard', 'aprimoramentoNegativePoints', {
    name: game.i18n.localize('DAEMON_WIZARD.Settings.NegativeAprimoramentos'),
    hint: game.i18n.localize('DAEMON_WIZARD.Settings.NegativeAprimoramentosHint'),
    scope: 'world',
    config: true,
    type: Number,
    default: 0
  });
};
