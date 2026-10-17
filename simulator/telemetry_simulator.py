import argparse
import random
import time

import requests


API_URL = "http://127.0.0.1:8001/telemetry/1"


def generate_normal_telemetry():
    return {
        "temperature": round(random.uniform(65.0, 75.0), 2),
        "vibration": round(random.uniform(2.0, 4.0), 2),
        "power_consumption": round(random.uniform(10.0, 16.0), 2),
        "rpm": random.randint(1700, 1900),
    }


def generate_warning_telemetry():
    return {
        "temperature": round(random.uniform(81.0, 88.0), 2),
        "vibration": round(random.uniform(5.2, 6.8), 2),
        "power_consumption": round(random.uniform(17.2, 19.5), 2),
        "rpm": random.randint(1550, 1690),
    }


def generate_critical_telemetry():
    return {
        "temperature": round(random.uniform(91.0, 100.0), 2),
        "vibration": round(random.uniform(8.0, 10.0), 2),
        "power_consumption": round(random.uniform(21.0, 25.0), 2),
        "rpm": random.choice([
            random.randint(1200, 1450),
            random.randint(2050, 2300),
        ]),
    }


def generate_telemetry(mode):
    if mode == "normal":
        return generate_normal_telemetry()

    if mode == "warning":
        return generate_warning_telemetry()

    if mode == "critical":
        return generate_critical_telemetry()

    raise ValueError(f"Unsupported mode: {mode}")


def send_telemetry(mode):
    data = generate_telemetry(mode)

    response = requests.post(
        API_URL,
        params=data,
        timeout=10,
    )

    response.raise_for_status()

    result = response.json()

    print(
        f"[{mode.upper()}] Telemetry sent | "
        f"Temp: {result['temperature']}°C | "
        f"Vibration: {result['vibration']} mm/s | "
        f"Power: {result['power_consumption']} kW | "
        f"RPM: {result['rpm']}"
    )


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="ForgeTwin AI - Machine Telemetry Simulator"
    )

    parser.add_argument(
        "--mode",
        choices=["normal", "warning", "critical"],
        default="normal",
        help="Machine operating condition",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_arguments()

    print("ForgeTwin AI - Telemetry Simulator")
    print("Machine: CNC001 (ID: 1)")
    print(f"Operating mode: {args.mode.upper()}")
    print("Sending telemetry every 5 seconds...")
    print("Press CTRL+C to stop.\n")

    while True:
        try:
            send_telemetry(args.mode)
            time.sleep(5)

        except requests.RequestException as error:
            print(f"API connection error: {error}")
            time.sleep(5)

        except KeyboardInterrupt:
            print("\nTelemetry simulator stopped.")
            break