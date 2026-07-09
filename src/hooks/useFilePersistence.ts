import { useCallback, useState } from 'react';

export const useFilePersistence = ({
  currentFileName,
  handleSaveFile,
  handleNewCanvas,
  showToast,
}: {
  currentFileName: string | null;
  handleSaveFile: () => void | Promise<void>;
  handleNewCanvas: () => void | Promise<void>;
  showToast: (msg: string) => void;
}) => {
  // ── 存檔確認 Modal ──────────────────────────────────────────
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  // 有既有 handle 時先跳確認，否則直接開 Save As
  const handleSaveFileWithConfirm = useCallback(() => {
    if (currentFileName) {
      setSaveConfirmOpen(true);
    } else {
      handleSaveFile();
    }
  }, [currentFileName, handleSaveFile]);

  const handleSaveConfirmProceed = useCallback(async () => {
    setSaveConfirmOpen(false);
    await handleSaveFile();
  }, [handleSaveFile]);

  const handleSaveConfirmDiscard = useCallback(async () => {
    setSaveConfirmOpen(false);
    await handleNewCanvas(); // 清除 handle，下次存檔會開 Save As
    showToast('已中斷連結，下次存檔將另存新檔');
  }, [handleNewCanvas, showToast]);

  return {
    saveConfirmOpen,
    setSaveConfirmOpen,
    handleSaveFileWithConfirm,
    handleSaveConfirmProceed,
    handleSaveConfirmDiscard,
  };
};
