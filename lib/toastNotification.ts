import Toast from "react-native-toast-message";


export default function toastNotification(type: 'error' | 'warning' | 'info' | 'success', text1: string, text2: string | null) {
    Toast.show({
                type,
                text1,
                text2,
                autoHide: true,
                visibilityTime: 3000,
            });
}