import axiosIns from "../../plugins/axios"

export const useLoginStore = {
    actions: {
        async dangNhap(payload) {
            const response = await axiosIns.post('/api/auth/dangnhap', payload)
            return response
        },
        async dangKy(payload) {
            return await axiosIns.post(`/api/auth/dangky`, payload)
        },
    },
}

