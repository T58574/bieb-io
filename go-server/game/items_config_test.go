package game

import (
	"testing"
)

func TestGetItemModifier(t *testing.T) {
	// Setup
	itemRegistryMu.Lock()
	originalRegistry := itemRegistry

	// Create a new registry for the test
	itemRegistry = map[uint16]ItemModifier{
		1: {
			ID:     1,
			Rarity: 2,
			StatModifiers: ItemStatModifiers{
				FlatHP: 10,
			},
		},
		2: {
			ID:     2,
			Rarity: 1,
		},
	}
	itemRegistryMu.Unlock()

	// Cleanup
	defer func() {
		itemRegistryMu.Lock()
		itemRegistry = originalRegistry
		itemRegistryMu.Unlock()
	}()

	t.Run("ExistingItemWithStats", func(t *testing.T) {
		mod, exists := GetItemModifier(1)
		if !exists {
			t.Errorf("Expected item 1 to exist")
		}
		if mod.ID != 1 || mod.Rarity != 2 || mod.StatModifiers.FlatHP != 10 {
			t.Errorf("Item 1 properties don't match expected values: %+v", mod)
		}
	})

	t.Run("ExistingItemWithoutStats", func(t *testing.T) {
		mod, exists := GetItemModifier(2)
		if !exists {
			t.Errorf("Expected item 2 to exist")
		}
		if mod.ID != 2 || mod.Rarity != 1 {
			t.Errorf("Item 2 properties don't match expected values: %+v", mod)
		}
	})

	t.Run("NonExistingItem", func(t *testing.T) {
		_, exists := GetItemModifier(999)
		if exists {
			t.Errorf("Expected item 999 to not exist")
		}
	})
}
