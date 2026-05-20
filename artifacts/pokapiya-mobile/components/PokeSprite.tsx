import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { spriteUrl, backSpriteUrl } from '../data/pokedex';

interface Props {
  id: number;
  size?: number;
  back?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function PokeSprite({ id, size = 96, back = false, style }: Props) {
  const uri = back ? backSpriteUrl(id) : spriteUrl(id);
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
