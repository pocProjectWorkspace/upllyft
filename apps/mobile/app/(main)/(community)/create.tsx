import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { PostType } from '../../../lib/types/community';
import { createPost } from '../../../lib/api/community';

const POST_TYPES: { label: string; value: PostType; color: string }[] = [
  { label: 'Discussion', value: 'DISCUSSION', color: '#0D9488' },
  { label: 'Q&A', value: 'QUESTION', color: '#3B82F6' },
  { label: 'Case Study', value: 'CASE_STUDY', color: '#8B5CF6' },
  { label: 'Resource', value: 'RESOURCE', color: '#F59E0B' },
  { label: 'Story', value: 'STORY', color: '#EC4899' },
];

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('DISCUSSION');
  const [category, setCategory] = useState('general');
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  const selectedType = POST_TYPES.find((t) => t.value === type)!;

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Error', 'Content is required');
      return;
    }
    setSubmitting(true);
    try {
      const tags = tagsText
        ? tagsText.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined;
      await createPost({ title: title.trim(), content: content.trim(), type, category, tags });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.teal} />
            ) : (
              <Text style={[styles.postBtn, (!title.trim() || !content.trim()) && styles.postBtnDisabled]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          {/* Type picker */}
          <TouchableOpacity
            style={styles.typePicker}
            onPress={() => setTypePickerVisible(true)}
          >
            <View style={[styles.typeBadge, { backgroundColor: selectedType.color + '18' }]}>
              <Text style={[styles.typeBadgeText, { color: selectedType.color }]}>
                {selectedType.label}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            placeholderTextColor={COLORS.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Write your post..."
            placeholderTextColor={COLORS.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          <TextInput
            style={styles.tagsInput}
            placeholder="Tags (comma separated)"
            placeholderTextColor={COLORS.textSecondary}
            value={tagsText}
            onChangeText={setTagsText}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Type picker modal */}
      <Modal visible={typePickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Post Type</Text>
            <FlatList
              data={POST_TYPES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setType(item.value);
                    setTypePickerVisible(false);
                  }}
                >
                  <View style={[styles.modalDot, { backgroundColor: item.color }]} />
                  <Text style={styles.modalLabel}>{item.label}</Text>
                  {type === item.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.teal} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  postBtn: { fontSize: 16, fontWeight: '700', color: COLORS.teal },
  postBtnDisabled: { opacity: 0.4 },
  form: { padding: 20, gap: 16 },
  typePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: 8,
  },
  contentInput: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    minHeight: 200,
    paddingVertical: 8,
  },
  tagsInput: {
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  modalDot: { width: 12, height: 12, borderRadius: 6 },
  modalLabel: { flex: 1, fontSize: 16, color: COLORS.text },
});
