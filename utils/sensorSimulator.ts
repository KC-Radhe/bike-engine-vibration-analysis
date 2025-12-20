
export interface SimulatedSensorData {
    vibrationX: number;
    vibrationY: number;
    vibrationZ: number;
    frequency: number;
}   

export function genereateSimulatedData(
    condition: 'healthy' | 'warning' | 'faulty' = 'healthy'
): SimulatedSensorData {
    let baseVibration: number;
    let baseFreq: number;

    switch (condition) {
        case 'healthy':
            baseVibration = 0.5 + Math.random() * 1; //let healthy engine ranges 0.5 to 1.5m/s²
            baseFreq = 20 + Math.random() * 15;
            break;
        case 'warning':
            baseVibration = 2.5 + Math.random() * 1.5;
            baseFreq = 50 + Math.random() * 15;
            break;
        case 'faulty':
            baseVibration = 4.5 + Math.random() * 2;
            baseFreq = 70 + Math.random() * 20;
            break;
    };

    return {
        //adding randomness to axes; gives non-uniform vibration simulating real-world sensor behavior
        //randomness ranges 0.8 to 1.2m/s² | 
        vibrationX: baseVibration * (0.8 + Math.random() * 0.4),
        vibrationY: baseVibration * (0.8 + Math.random() * 0.4),
        vibrationZ: baseVibration * (0.8 + Math.random() * 0.4),
        frequency: baseFreq,
    };
}