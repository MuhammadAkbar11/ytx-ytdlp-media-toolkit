import { input, checkbox } from '@inquirer/prompts';
import Fuse from 'fuse.js';
import { PlaylistItem } from '../playlist/playlist-inspector';

export class SearchablePlaylistSelector {
  private readonly SEARCH_THRESHOLD = 15;

  /**
   * Prompts the user to select items from a playlist.
   * Uses Fuse.js for fuzzy filtering if the playlist is large.
   *
   * @param items The playlist items to select from.
   * @returns An array of selected playlist indices as a comma-separated string, or undefined if cancelled/empty.
   */
  async promptForSelection(items: PlaylistItem[]): Promise<string | undefined> {
    if (items.length === 0) {
      return undefined;
    }

    let filteredItems = items;

    // Optional Search/Filter Step
    if (items.length >= this.SEARCH_THRESHOLD) {
      const searchQuery = await input({
        message: 'Search playlist videos (leave empty to skip and view all):',
      });

      if (searchQuery.trim().length > 0) {
        const fuse = new Fuse(items, {
          keys: ['title', 'id'],
          threshold: 0.4,
        });
        const results = fuse.search(searchQuery.trim());
        filteredItems = results.map((r) => r.item);

        console.log(
          `\nFound ${filteredItems.length} match${filteredItems.length === 1 ? '' : 'es'}\n`
        );
      }
    }

    if (filteredItems.length === 0) {
      console.log('No items matched your search.');
      return undefined;
    }

    // Checkbox Selection Step
    const choices = filteredItems.map((item) => ({
      name: `${item.index}. ${item.title}`,
      value: item.index.toString(),
      checked: true, // by default select all filtered items, or maybe uncheck? Let's leave them unchecked by default so user can select, except if they filtered, they might want all filtered. Actually, let's leave them unchecked for consistency, but standard behavior is unchecked. Wait, if it's a search, maybe checked=true? Let's leave it false.
    }));

    const selectedIndices = await checkbox({
      message:
        'Select items to download (Space to toggle, A to toggle all, Enter to confirm):',
      choices,
      loop: false,
      pageSize: 15,
    });

    if (!selectedIndices || selectedIndices.length === 0) {
      return undefined;
    }

    // Return as comma separated string of indices (e.g., "1,3,5")
    return selectedIndices.sort((a, b) => parseInt(a) - parseInt(b)).join(',');
  }
}
