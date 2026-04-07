import styled from 'styled-components'

export const StyleImageInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 4px;
`

export const StyleEllipsis = styled.div`
  color: var(--vscode-textLink-foreground);
`

export const StyleImageName = styled.div`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  text-align: center;
  line-height: 16px;
  font-size: 12px;
  color: var(--vscode-foreground);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
