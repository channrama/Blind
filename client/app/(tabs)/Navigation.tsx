import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Navigation: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>YOLOv5 Object Detection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
});

export default Navigation;
