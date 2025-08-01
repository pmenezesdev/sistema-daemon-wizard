// scripts/utils/compendiumService.js

/**
 * Um serviço para lidar com operações relacionadas a compêndios.
 */
export class CompendiumService {
  /**
   * Carrega todos os itens de um compêndio específico.
   * @param {string} compendiumName - O nome do compêndio (ex: 'daemonrpg.aprimoramentos').
   * @returns {Promise<Array>} - Uma promessa que resolve para um array de itens do compêndio.
   */
  static async fetchCompendiumItems(compendiumName) {
    const pack = game.packs.get(compendiumName);
    if (!pack) {
      ui.notifications.error(`Compêndio '${compendiumName}' não encontrado!`);
      console.error(`Daemon Wizard | Compendium '${compendiumName}' not found.`);
      return [];
    }
    // Carrega todos os documentos do índice do compêndio
    const documents = await pack.getDocuments();
    return documents;
  }
}
