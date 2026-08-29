import { Modal, Button, Input, Space, Checkbox, Select, Divider } from "antd";
import React, { FC, useState } from "react";

const { TextArea } = Input;

interface ISettingsModalProps {
  includeFolders: string[];
  excludeFolders: string[];
  visible: boolean;
  showImageTypes: string[];
  allImageTypes: string[];
  cellAspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  imageGridColumns: number;
  showFileName: boolean;
  showFolders: boolean;
  // eslint-disable-next-line no-unused-vars
  onApply: (
    includeFolders: string[],
    excludeFolders: string[],
    showImageTypes: string[],
    cellAspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16',
    imageGridColumns: number,
    showFileName: boolean,
    showFolders: boolean
  ) => void;
  onClose: () => void;
}

const SettingsModal: FC<ISettingsModalProps> = ({
  includeFolders: initIncludeFolders,
  excludeFolders: initExcludeFolders,
  visible,
  showImageTypes: initShowImageTypes,
  allImageTypes,
  cellAspectRatio: initCellAspectRatio,
  imageGridColumns: initImageGridColumns,
  showFileName: initShowFileName,
  showFolders: initShowFolders,
  onApply,
  onClose
}) => {
  const [includeFolders, setIncludeFolders] = useState<string>(initIncludeFolders.join("\n"));
  const [excludeFolders, setExcludeFolders] = useState<string>(initExcludeFolders.join("\n"));
  const [showImageTypes, setShowImageTypes] = useState<string[]>(initShowImageTypes);
  const [cellAspectRatio, setCellAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '3:4' | '9:16'>(initCellAspectRatio);
  const [imageGridColumns, setImageGridColumns] = useState<number>(initImageGridColumns);
  const [showFileName, setShowFileName] = useState<boolean>(initShowFileName);
  const [showFolders, setShowFolders] = useState<boolean>(initShowFolders);

  const handleApply = () => {
    const includeFoldersArray = includeFolders.split("\n").map(i => i.trim()).filter(i => i);
    const excludeFoldersArray = excludeFolders.split("\n").map(i => i.trim()).filter(i => i);
    onApply(
      includeFoldersArray,
      excludeFoldersArray,
      showImageTypes,
      cellAspectRatio,
      imageGridColumns,
      showFileName,
      showFolders
    );
    onClose();
  };

  const handleReset = () => {
    setShowImageTypes(allImageTypes);
    setCellAspectRatio('16:9');
    setImageGridColumns(2);
    setShowFileName(true);
    setShowFolders(true);
    setIncludeFolders("");
    setExcludeFolders("");
  };

  const COLUMN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((c) => ({
    label: `${c} Columns`,
    value: c
  }));

  return (
    <Modal title='Settings' open={visible} onCancel={onClose} footer={null} destroyOnClose width={520}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Gallery Display & Layout</div>
      
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, color: 'var(--vscode-descriptionForeground)' }}>Image Extensions:</div>
        <Checkbox.Group
          options={allImageTypes.map((t) => ({ label: t, value: t }))}
          value={showImageTypes}
          onChange={(vals) => setShowImageTypes(vals as string[])}
        />
      </div>

      <Space size='middle' style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ marginBottom: 4, color: 'var(--vscode-descriptionForeground)' }}>Aspect Ratio:</div>
          <Select<'16:9' | '4:3' | '1:1' | '3:4' | '9:16'>
            value={cellAspectRatio}
            onChange={setCellAspectRatio}
            style={{ width: 150 }}
            options={[
              { label: '16:9 Landscape', value: '16:9' },
              { label: '4:3 Standard', value: '4:3' },
              { label: '1:1 Square', value: '1:1' },
              { label: '3:4 Portrait', value: '3:4' },
              { label: '9:16 Portrait', value: '9:16' }
            ]}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, color: 'var(--vscode-descriptionForeground)' }}>Grid Columns:</div>
          <Select<number>
            value={imageGridColumns}
            onChange={setImageGridColumns}
            style={{ width: 130 }}
            options={COLUMN_OPTIONS}
          />
        </div>
      </Space>

      <Space size='large' style={{ marginBottom: 12 }}>
        <Checkbox checked={showFileName} onChange={(e) => setShowFileName(e.target.checked)}>
          Show filename below thumbnails
        </Checkbox>
        <Checkbox checked={showFolders} onChange={(e) => setShowFolders(e.target.checked)}>
          Show folder accordions
        </Checkbox>
      </Space>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ fontWeight: 600, marginBottom: 8 }}>Directory Filtering</div>
      <div>Enter directories to <b>include</b> in search, one per line:</div>
      <TextArea
        autoSize={{ minRows: 3, maxRows: 6 }}
        placeholder="e.g. assets"
        value={includeFolders}
        onChange={(e) => setIncludeFolders(e.target.value)}
        style={{ marginTop: 4 }}
      />
      <div style={{ margin: '12px 0 0 0' }}>Enter directories to <b>exclude</b> from search, one per line:</div>
      <TextArea
        autoSize={{ minRows: 3, maxRows: 6 }}
        placeholder="e.g. dist/assets"
        value={excludeFolders}
        onChange={(e) => setExcludeFolders(e.target.value)}
        style={{ marginTop: 4 }}
      />
      <Space style={{ margin: '20px 0 0 0' }}>
        <Button type="primary" onClick={handleApply}>Save & Apply</Button>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
      </Space>
    </Modal>
  );
};

export default SettingsModal;