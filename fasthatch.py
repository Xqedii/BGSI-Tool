import time
import threading
import keyboard
import sys
from pynput.keyboard import Controller

keyboard_controller = Controller()

is_running = True
click_interval = 0.1
stop_thread = False
active_thread = None

def press_r_key():
    global stop_thread, is_running
    
    while not stop_thread and is_running:
        keyboard_controller.press('r')
        keyboard_controller.release('r')
        time.sleep(click_interval)

def main():
    global click_interval, active_thread, stop_thread
    
    if len(sys.argv) > 1:
        speed = int(sys.argv[1])
        if speed <= 0:
            speed = 10
        click_interval = 1.0 / speed
    
    stop_thread = False
    active_thread = threading.Thread(target=press_r_key)
    active_thread.daemon = True
    active_thread.start()
    
    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        stop_thread = True
        if active_thread:
            active_thread.join(0.2)

if __name__ == "__main__":
    main()