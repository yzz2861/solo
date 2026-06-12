declare global {
  interface Window {
    api: {
      order: {
        create: (data: any) => Promise<any>
        list: () => Promise<any[]>
        get: (id: number) => Promise<any>
        update: (id: number, updates: any, operator?: string) => Promise<any>
        delete: (id: number) => Promise<any>
        pending: () => Promise<any[]>
      }
      version: {
        add: (orderId: number, data: any) => Promise<any>
        setFinal: (orderId: number, versionId: number, isFinal: boolean) => Promise<any>
        delete: (id: number) => Promise<any>
      }
      warnings: {
        check: () => Promise<any[]>
        list: () => Promise<any[]>
        markRead: (id: number) => Promise<any>
      }
      export: {
        deliveryList: (startDate: string, endDate: string) => Promise<any[]>
        excel: (data: any[], fileName: string) => Promise<any>
      }
      file: {
        check: (path: string) => Promise<boolean>
      }
    }
  }
}

export {}
