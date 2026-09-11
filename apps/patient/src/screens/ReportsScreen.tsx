import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, PageTitle, EmptyState } from '@coracure/ui';
import { spacing } from '@coracure/brand';

export const ReportsScreen = () => {
  return (
    <Screen>
      <PageTitle title="Reports" />
      <View style={s.content}>
        <EmptyState
          icon="folder"
          title="No reports yet"
          body="Your consultation reports and prescriptions will appear here."
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xxxl,
  },
});

export default ReportsScreen;
