import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListProducts, useGetSearchSuggestions } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestions } = useGetSearchSuggestions(
    { q: query },
    { query: { enabled: query.length >= 2 && query !== submitted } as any }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: searchResults, isLoading: searchLoading } = useListProducts(
    { search: submitted, limit: 20, page: 1 },
    { query: { enabled: submitted.length >= 2 } as any }
  );

  const handleSearch = () => {
    if (query.trim().length >= 2) {
      setSubmitted(query.trim());
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: submitted ? 0 : 1,
      borderBottomColor: colors.border,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: 12,
      paddingHorizontal: 12,
      gap: 8,
      height: 44,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      height: 44,
    },
    suggestItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestText: { fontSize: 14, color: colors.foreground },
    suggestType: { fontSize: 11, color: colors.mutedForeground },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      gap: 12,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setSubmitted(''); }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Suggestions dropdown */}
      {query.length >= 2 && query !== submitted && suggestions && suggestions.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {suggestions.slice(0, 6).map((s) => (
            <Pressable
              key={`${s.type}-${s.id}`}
              style={({ pressed }) => [styles.suggestItem, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { setQuery(s.name); setSubmitted(s.name); }}
            >
              <Ionicons
                name={s.type === 'product' ? 'phone-portrait-outline' : s.type === 'category' ? 'grid-outline' : 'business-outline'}
                size={16}
                color={colors.mutedForeground}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestText}>{s.name}</Text>
              </View>
              <Text style={styles.suggestType}>{s.type === 'product' ? 'Produit' : s.type === 'category' ? 'Catégorie' : 'Marque'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Empty / initial state */}
      {submitted.length < 2 && query.length < 2 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 }}>
          <Ionicons name="search-outline" size={56} color={colors.muted} />
          <Text style={{ fontSize: 16, color: colors.mutedForeground, fontWeight: '600' }}>
            Rechercher des produits
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 40 }}>
            Téléphones, accessoires, pièces détachées...
          </Text>
        </View>
      )}

      {/* Search results */}
      {submitted.length >= 2 && (
        <>
          {searchLoading ? (
            <View style={styles.grid}>
              {Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
            </View>
          ) : (
            <FlatList
              data={searchResults?.products ?? []}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }}
              columnWrapperStyle={{ gap: 12 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
                  <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
                    Aucun résultat pour "{submitted}"
                  </Text>
                </View>
              }
              ListHeaderComponent={
                searchResults && searchResults.total > 0 ? (
                  <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 8 }}>
                    {searchResults.total} résultat{searchResults.total > 1 ? 's' : ''} pour "{submitted}"
                  </Text>
                ) : null
              }
              renderItem={({ item }) => <ProductCard product={item} />}
            />
          )}
        </>
      )}
    </View>
  );
}
