import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { COLORS } from '../../lib/constants';
import { trackAdClick, type BannerAd } from '../../lib/api/banner-ads';

interface FeedAdProps {
  ad: BannerAd;
}

export default function FeedAd({ ad }: FeedAdProps) {
  const handlePress = () => {
    trackAdClick(ad.id).catch(() => {});
    Linking.openURL(ad.targetUrl).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <Image
        source={{ uri: ad.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Sponsored</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.title} numberOfLines={1}>
          {ad.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  image: {
    width: '100%',
    height: 160,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
