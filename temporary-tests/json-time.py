import json
import time
from datetime import datetime

# ANSI color helper
def rgb(r, g, b):
    return f"\033[38;2;{r};{g};{b}m"

RESET = "\033[0m"
#DCDCAA
# Color definitions
COLOR_STRING = rgb(206, 145, 120)   # #CE9178
COLOR_NUMBER = rgb(181, 206, 168)   # #B5CEA8
COLOR_VARIABLE = rgb(156, 220, 254) # #9CDCFE
COLOR_BRACES = rgb(255, 255, 100)

def GetCurrentDate():
    current_date = datetime.now()

    return {
        "Date": {
            "year": current_date.year,
            "month": current_date.strftime("%B"),
            "day": current_date.strftime("%A"),
            "hour": current_date.hour,
            "minute": current_date.minute,
            "second": current_date.second
        }
    }


def colorize_json(data, indent=0):
    spacing = " " * indent
    result = ""

    if isinstance(data, dict):
        result += COLOR_BRACES + "{\n" + RESET
        items = list(data.items())

        for i, (key, value) in enumerate(items):
            result += spacing + " " * 4
            result += COLOR_VARIABLE + f'"{key}"' + RESET + ": "
            result += colorize_json(value, indent + 4)

            if i < len(items) - 1:
                result += ","
            result += "\n"

        result += spacing + COLOR_BRACES + "}" + RESET

    elif isinstance(data, str):
        result += COLOR_STRING + f'"{data}"' + RESET

    elif isinstance(data, (int, float)):
        result += COLOR_NUMBER + str(data) + RESET

    else:
        result += str(data)

    return result


def UpdateClock(interval=1):
    try:
        while True:
            json_data = GetCurrentDate()

            # Clear console
            print("\033[H\033[J", end="")

            print(colorize_json(json_data))
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    UpdateClock()