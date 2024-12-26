import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

const ReadDocs = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scan and summarize the Text screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25292e',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ReadDocs;
