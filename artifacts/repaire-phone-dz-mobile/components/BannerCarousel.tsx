import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  buttonText?: string | null;
  linkUrl?: string | null;
}

interface BannerCarouselProps {
  banners: Banner[];
  onBannerPress?: (banner: Banner) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

const GRADIENT_COLORS = ['#1a56db', '#1e3a5f', '#f97316', '#2563eb', '#7c3aed'];

export function BannerCarousel({ banners, onBannerPress }: BannerCarouselProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Banner>>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      const next = (activeIndex + 1) % banners.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex, banners.length]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  if (!banners.length) return null;

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <Pressable
            style={{ width: SCREEN_WIDTH - 32, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' }}
            onPress={() => onBannerPress?.(item)}
          >
            <View
              style={{
                height: BANNER_HEIGHT,
                backgroundColor: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                borderRadius: 16,
                overflow: 'hidden',
                flexDirection: 'row',
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : null}
              {/* Dark overlay for text readability */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: item.imageUrl ? 'rgba(0,0,0,0.35)' : 'transparent',
                    padding: 20,
                    justifyContent: 'flex-end',
                  },
                ]}
              >
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 12 }}>
                    {item.subtitle}
                  </Text>
                )}
                {item.buttonText && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#f97316',
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                      {item.buttonText}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
      {banners.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? colors.primary : colors.muted,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function BannerSkeleton() {
  const colors = useColors();
  return (
    <View style={{ marginHorizontal: 16 }}>
      <View
        style={{
          height: BANNER_HEIGHT,
          backgroundColor: colors.muted,
          borderRadius: 16,
        }}
      />
    </View>
  );
}
