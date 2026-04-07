import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import styled from 'styled-components'
import { BACKGROUND_CHECKERBOARD, BACKGROUND_TRANSPARENT } from '../../constants'

export const StyledFolderOpenTwoTone = styled.span`
  visibility: hidden;
  margin-left: 12px;
  font-size: 16px;
  font-weight: 500;
`

export const StyledPreviewImages = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  .ant-collapse > .ant-collapse-item > .ant-collapse-header{
    padding: 8px 12px;
  }
  .ant-collapse-content > .ant-collapse-content-box {
    padding: 12px 12px 0 12px;
  }
  .ant-collapse-header {
    :hover ${StyledFolderOpenTwoTone} {
      visibility: visible;
      :active {
        position: relative;
        top: 2px;
      }
    }
  }
  .ant-collapse-content-box {
    position: relative;
  }
  .ant-collapse > .ant-collapse-item > .ant-collapse-header {
    padding: 4px 12px;
  }
`

export const StyleTopRows = styled.div`
  position: relative;
  margin: 0 0 10px 0;
  flex-shrink: 0;
`

/** Flex slot between toolbar and list; clips so only the list scrolls. */
export const StyleMainScrollSlot = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const StyleImageList = styled.div`
  display: grid;
  width: 100%;
  grid-template-columns: repeat(var(--iv-grid-cols, 8), minmax(0, 1fr));
  gap: 12px;
  align-items: start;
`

export const StyleImage = styled.div`
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: stretch;
  min-width: 0;

  div .ant-image {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    border: none;
    box-shadow: none;
  }

  div .ant-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border: none;
    outline: none;
  }
`

export const StyleImageDirPath = styled.div`
  background-color: #d7e9f4;
  margin: 12px 0 2px 0;
  padding: 4px 8px;
`

interface IStyleSquareProps {
  isSelected: boolean
  color: string
}

const checkerboardBg = `
  background-color: #e8e8e8;
  background-image:
    linear-gradient(45deg, #c8c8c8 25%, transparent 25%),
    linear-gradient(-45deg, #c8c8c8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #c8c8c8 75%),
    linear-gradient(-45deg, transparent 75%, #c8c8c8 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
`

export const StyleSquare = styled.span<IStyleSquareProps>`
  display: inline-block;
  width: 20px;
  height: 20px;
  height: ${(props) => (props.isSelected ? '26px' : '20px')};
  width: ${(props) => (props.isSelected ? '26px' : '20px')};
  border: 1px solid var(--iv-thumb-edge, var(--vscode-widget-border, #ddd));
  box-sizing: border-box;
  ${(props) => {
    if (props.color === BACKGROUND_CHECKERBOARD) {
      return checkerboardBg
    }
    if (props.color === BACKGROUND_TRANSPARENT) {
      return 'background-color: transparent;'
    }
    return `background-color: ${props.color};`
  }}
  position: relative;
  top: 5px;
  margin-right: 12px;
  cursor: pointer;
`

export const StyleRowTitle = styled.span`
  font-weight: 500;
  margin-right: 16px;
`

export const StyledPicCount = styled.span`
  color: var(--iv-secondary-fg, var(--vscode-descriptionForeground));
  margin: 0 0 0 12px;
`

/** Scrollbar colors themed via `.iv-image-list-scroll` in `antd-global.css`. */
export const StyledImgsContainer = styled.div.attrs({ className: 'iv-image-list-scroll' })`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--vscode-panel-border, #eee);
  border-left: none;
  border-right: none;
`

export const StyledBetweenWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const toolbarIconSlot = `
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: inherit;
  opacity: 0.9;
  box-sizing: border-box;
`

export const StyledSettingOutlined = styled(SettingOutlined)`
  ${toolbarIconSlot}
  right: 56px;
  font-size: 20px;
`

export const StyledThemeToggle = styled.span`
  ${toolbarIconSlot}
  right: 28px;
  font-size: 20px;
  cursor: pointer;
`

export const StyledReloadOutlined = styled(ReloadOutlined)`
  ${toolbarIconSlot}
  right: 0;
  /* 比其余大 0.5px，略增笔画感但不抢眼 */
  font-size: 20.5px;
`