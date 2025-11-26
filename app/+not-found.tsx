import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";


export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!!!'}}/>
            <View style={styles.container} >
                <Text style={styles.text}>
                    This screen does not exist.
                </Text>
                <Link href='/(tabs)/login' style={styles.link} >
                    <Text style={styles.linkText}>Goto home screen</Text>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f8fafc',
    },
    text: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e293b',
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: '500',
    },
});