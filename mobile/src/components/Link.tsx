import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useRouter } from 'expo-router';

interface LinkProps extends TouchableOpacityProps {
  href: string;
  children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({ href, children, onPress, ...props }) => {
  const router = useRouter();

  const handlePress = (e: any) => {
    onPress?.(e);
    router.push(href);
  };

  return (
    <TouchableOpacity {...props} onPress={handlePress}>
      {children}
    </TouchableOpacity>
  );
};
