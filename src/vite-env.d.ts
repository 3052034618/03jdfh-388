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
    saveProject: (data: any) => Promise<{ success: boolean; path?: string; fileName?: string }>
    loadProject: () => Promise<{ success: boolean; data?: any; path?: string; fileName?: string }>
    saveRecentProject: (filePath: string, fileName: string) => Promise<{ success: boolean; error?: string }>
    getRecentProject: () => Promise<{ success: boolean; data?: any; error?: string }>
    loadRecentProject: () => Promise<{ success: boolean; data?: any; path?: string; fileName?: string; reason?: string; error?: string }>
  }
}
