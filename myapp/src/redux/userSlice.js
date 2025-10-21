import { createSlice } from "@reduxjs/toolkit";

export default createSlice({
    name: "user",
    initialState: {
        token: "",
        quyenList: [''],
        nguoiDung: { userID: -1 }
    },
    reducers: {
        dangNhap: (state, action) => {

            if (action.payload.token) {
                localStorage.setItem("token", action.payload.token);
                state.token = action.payload.token;
            }

            if (action.payload.quyenList) {
                state.quyenList = action.payload.quyenList;
            }
            if (action.payload.nguoiDung) {
                state.nguoiDung = action.payload.nguoiDung;
            }
        },
        capNhatProfile: (state, action) => {

            state.nguoiDung = { ...state.nguoiDung, ...action.payload };
        },
        dangXuat: (state) => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("quyenList");
            localStorage.removeItem("refreshToken");
            state.token = "";
            state.quyenList = [''];
            state.nguoiDung = { userID: -1 };
        }
    }
});

