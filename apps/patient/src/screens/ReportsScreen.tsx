import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';
import { filesApi, type PatientFile, type FileRequest } from '@coracure/api';

interface ConsultationDocGroup {
  date: string;
  doctor: string;
  consultationCode: string;
  files: {
    id: string;
    name: string;
    tag: string;
    size: string;
    isRecord: boolean;
  }[];
}

const DEFAULT_DOC_GROUPS: ConsultationDocGroup[] = [
  {
    date: '24 May 2026',
    doctor: 'Dr. Richard Parker',
    consultationCode: '#CC-2026-8841',
    files: [
      { id: 'f1', name: 'Knee X-Ray Report.pdf', tag: 'Record', size: '2.4 MB', isRecord: true },
      { id: 'f2', name: 'Lab Blood Count.pdf', tag: 'Lab', size: '1.1 MB', isRecord: false },
      { id: 'f3', name: 'Post-Op Discharge.pdf', tag: 'Record', size: '840 KB', isRecord: true },
      { id: 'f4', name: 'Physiotherapy Plan.pdf', tag: 'Plan', size: '520 KB', isRecord: false },
    ],
  },
  {
    date: '18 May 2026',
    doctor: 'Dr. Richard Parker',
    consultationCode: '#CC-2026-8712',
    files: [
      { id: 'f5', name: 'Initial MRI Knee Scan.pdf', tag: 'Scan', size: '4.2 MB', isRecord: true },
      { id: 'f6', name: 'Consultation Summary.pdf', tag: 'Record', size: '610 KB', isRecord: true },
    ],
  },
  {
    date: '11 May 2026',
    doctor: 'Dr. Richard Parker',
    consultationCode: '#CC-2026-8501',
    files: [
      { id: 'f7', name: 'Pre-Consultation History.pdf', tag: 'History', size: '750 KB', isRecord: false },
    ],
  },
];

export const ReportsScreen = () => {
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'reports' | 'prescriptions'>('reports');
  const [docGroups, setDocGroups] = useState<ConsultationDocGroup[]>(DEFAULT_DOC_GROUPS);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFileName, setNewFileName] = useState('Knee_XRay_Report_May2026.pdf');
  const [uploadTag, setUploadTag] = useState('Report');
  const [isUploading, setIsUploading] = useState(false);

  const handleDownload = (fileName: string) => {
    Alert.alert('Download Started', `Downloading ${fileName} to your device storage...`);
  };

  const handleViewFile = (fileName: string, isRecord: boolean) => {
    Alert.alert(
      fileName,
      isRecord
        ? 'Statutory Medical Record: This document is part of your official teleconsultation clinical file and is digitally signed by Dr. Richard Parker.'
        : 'Viewing personal health document.'
    );
  };

  const handleUploadSubmit = () => {
    if (!newFileName.trim()) {
      Alert.alert('Invalid File', 'Please enter a valid document name.');
      return;
    }
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setShowUploadModal(false);
      const newFileEntry = {
        id: `f-${Date.now()}`,
        name: newFileName.trim(),
        tag: uploadTag,
        size: '1.4 MB',
        isRecord: false,
      };
      setDocGroups((prev) => [
        {
          date: 'Today (Uploaded)',
          doctor: 'Alex Morgan (Self)',
          consultationCode: '#SELF-UPLOAD',
          files: [newFileEntry],
        },
        ...prev,
      ]);
      Alert.alert('Upload Successful', `${newFileName} uploaded to your clinical documents.`);
    }, 800);
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <LogoWide width={110} height={28} />

        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>My Documents 📁</Text>
          <Text style={s.pageSubtitle}>
            Prescriptions and reports from all consultations
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={s.tabsRow}>
          <Pressable
            style={[s.tabBtn, activeTab === 'reports' && s.tabBtnActive]}
            onPress={() => setActiveTab('reports')}
            accessibilityRole="button"
            accessibilityLabel="Reports tab"
          >
            <Icon
              name="folder"
              size={16}
              color={activeTab === 'reports' ? colors.white : colors.inkMuted}
            />
            <Text style={[s.tabBtnText, activeTab === 'reports' && s.tabBtnTextActive]}>
              Reports
            </Text>
          </Pressable>

          <Pressable
            style={[s.tabBtn, activeTab === 'prescriptions' && s.tabBtnActive]}
            onPress={() => {
              setActiveTab('prescriptions');
              navigation.navigate('Prescription');
            }}
            accessibilityRole="button"
            accessibilityLabel="Prescriptions tab"
          >
            <Icon
              name="clipboard"
              size={16}
              color={activeTab === 'prescriptions' ? colors.white : colors.inkMuted}
            />
            <Text style={[s.tabBtnText, activeTab === 'prescriptions' && s.tabBtnTextActive]}>
              Prescriptions
            </Text>
          </Pressable>
        </View>

        {/* Upload Document Trigger Card */}
        <Pressable
          style={s.uploadCard}
          onPress={() => setShowUploadModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Upload Document"
        >
          <View style={s.uploadIconCircle}>
            <Icon name="upload" size={20} color={colors.surfie} />
          </View>
          <View style={s.uploadTextCol}>
            <Text style={s.uploadTitle}>Upload Document</Text>
            <Text style={s.uploadSub}>
              + Tap here to upload medical history, imaging, or lab report
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.surfie} />
        </Pressable>

        {/* Grouped Documents List */}
        <View style={s.groupsList}>
          {docGroups.map((group, gIdx) => (
            <View key={`${group.consultationCode}-${gIdx}`} style={s.groupWrap}>
              {/* Group Header */}
              <View style={s.groupHeaderRow}>
                <View style={s.groupTitleCol}>
                  <Text style={s.groupDateDoctor}>
                    {group.date} • <Text style={s.groupDoctor}>{group.doctor}</Text>
                  </Text>
                </View>
                <View style={s.consultationPill}>
                  <Text style={s.consultationPillText}>
                    {group.consultationCode} ›
                  </Text>
                </View>
              </View>

              {/* Group Files */}
              <View style={s.groupCard}>
                {group.files.map((file, fIdx) => (
                  <View
                    key={file.id}
                    style={[s.fileRow, fIdx < group.files.length - 1 && s.fileRowBorder]}
                  >
                    <View style={s.fileIconWrap}>
                      <Icon name="document" size={20} color={colors.surfie} />
                    </View>

                    <View style={s.fileInfoCol}>
                      <View style={s.fileNameTagRow}>
                        <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
                        <View
                          style={[
                            s.tagBadge,
                            file.isRecord ? s.tagBadgeRecord : s.tagBadgeGeneric,
                          ]}
                        >
                          <Text
                            style={[
                              s.tagText,
                              file.isRecord ? s.tagTextRecord : s.tagTextGeneric,
                            ]}
                          >
                            {file.tag}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.fileSize}>{file.size}</Text>
                    </View>

                    {/* Actions */}
                    <View style={s.fileActions}>
                      <Pressable
                        style={s.actionBtn}
                        onPress={() => handleViewFile(file.name, file.isRecord)}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${file.name}`}
                      >
                        <Icon name="eye" size={16} color={colors.inkMuted} />
                      </Pressable>

                      <Pressable
                        style={s.actionBtn}
                        onPress={() => handleDownload(file.name)}
                        accessibilityRole="button"
                        accessibilityLabel={`Download ${file.name}`}
                      >
                        <Icon name="download" size={16} color={colors.surfie} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Upload Medical File</Text>
              <Pressable
                onPress={() => setShowUploadModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Icon name="x" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <Text style={s.modalSub}>
              Attach reports, scans or prescriptions to your patient medical profile (PT-10-01).
            </Text>

            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>Document Name</Text>
              <TextInput
                style={s.textInput}
                value={newFileName}
                onChangeText={setNewFileName}
                placeholder="e.g. Knee_MRI_Scan.pdf"
                placeholderTextColor={colors.inkFaint}
              />
            </View>

            <View style={s.formatNotice}>
              <Icon name="shieldCheck" size={16} color={colors.surfie} />
              <Text style={s.formatNoticeText}>
                Supported: PDF, JPG, PNG (Max 15MB). Stored securely with HIPAA/DISHA encryption.
              </Text>
            </View>

            <View style={s.modalActions}>
              <Pressable
                style={s.cancelBtn}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.submitBtn, isUploading && { opacity: 0.7 }]}
                onPress={handleUploadSubmit}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={s.submitText}>Upload Document</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CarePlan" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabBtnActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  tabBtnTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A7F3D0',
    gap: 12,
  },
  uploadIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTextCol: {
    flex: 1,
    gap: 2,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
  },
  uploadSub: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
  groupsList: {
    gap: 16,
    marginTop: 4,
  },
  groupWrap: {
    gap: 8,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  groupTitleCol: {
    flex: 1,
  },
  groupDateDoctor: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  groupDoctor: {
    fontWeight: '700',
    color: colors.ink,
  },
  consultationPill: {
    backgroundColor: '#EEF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  consultationPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  fileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfoCol: {
    flex: 1,
    gap: 2,
  },
  fileNameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagBadgeRecord: {
    backgroundColor: '#DCFCE7',
  },
  tagBadgeGeneric: {
    backgroundColor: '#F3F4F6',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  tagTextRecord: {
    color: '#16A34A',
  },
  tagTextGeneric: {
    color: colors.inkMuted,
  },
  fileSize: {
    fontSize: 10,
    color: colors.inkFaint,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  modalSub: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  },
  formatNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF8F5',
    padding: 10,
    borderRadius: 10,
  },
  formatNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.surfie,
    lineHeight: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});

export default ReportsScreen;
