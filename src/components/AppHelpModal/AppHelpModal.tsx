import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { createAppHelpModalStyles } from "@/components/AppHelpModal/AppHelpModal.styles";
import { AppHelpModalProps } from "@/components/AppHelpModal/AppHelpModal.types";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function AppHelpModal({ visible, onDismiss }: AppHelpModalProps) {
    const styles = useThemedStyles(createAppHelpModalStyles);
    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.title}>Vocationary 사용 안내</Text>
                        <Text style={styles.description}>
                            Vocationary는 영어 단어를 검색하고 저장하며 반복 학습할 수 있도록 도와주는 단어 학습
                            도구예요. 아래 순서를 참고해 첫 학습을 시작해보세요.
                        </Text>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>1. 단어 검색하기</Text>
                            <Text style={styles.sectionBody}>
                                하단의 `Search` 탭에서 단어를 입력하고 검색 버튼을 누르면 발음, 의미, 예문을 바로 확인할
                                수 있어요.
                            </Text>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>2. 즐겨찾기와 암기 상태</Text>
                            <Text style={styles.sectionBody}>
                                검색 결과에서 `즐겨찾기` 버튼을 누르면 단어가 내 단어장에 저장돼요. 단어의 암기
                                상태(외울 단어/복습/완료)를 바꿔가며 학습 진척도를 관리해보세요.
                            </Text>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>3. 홈 탭으로 학습 시작</Text>
                            <Text style={styles.sectionBody}>
                                `Home` 탭에서는 오늘 외워야 할 단어 수와 최근 검색한 단어를 한눈에 확인하고, 외울 단어
                                목록에서 바로 학습을 시작할 수 있어요.
                            </Text>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>4. 설정에서 계정 관리</Text>
                            <Text style={styles.sectionBody}>
                                `Settings` 탭에서 로그인, 회원가입, 게스트 모드 전환을 할 수 있어요. 계정 데이터는 이
                                기기에만 저장되므로, 다른 기기에서는 새 계정을 만들어야 해요.
                            </Text>
                        </View>
                    </ScrollView>
                    <Pressable
                        onPress={onDismiss}
                        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                    >
                        <Text style={styles.buttonText}>시작하기</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
