declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

interface Window {
  electronAPI: {
    saveProject: (data: any) => Promise<{ success: boolean; path?: string }>
    loadProject: () => Promise<{ success: boolean; data?: any; path?: string }>
  }
}
