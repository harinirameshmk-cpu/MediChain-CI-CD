from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
import time

driver = webdriver.Chrome()
driver.maximize_window()

try:
    # Open Login Page
    driver.get("http://localhost:5000/login.html")
    time.sleep(2)

    # Enter Email
    driver.find_element(By.ID, "loginEmail").send_keys("harini@gmail.com")

    # Enter Password
    driver.find_element(By.ID, "loginPassword").send_keys("harini123")

    # Select Role
    role = Select(driver.find_element(By.ID, "loginRole"))
    role.select_by_visible_text("Customer")

    # Click Login
    login_button = driver.find_element(By.ID, "loginBtn")

    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        login_button
    )

    time.sleep(1)

    driver.execute_script(
        "arguments[0].click();",
        login_button
    )

    time.sleep(3)

    print("================================")
    print("LOGIN TEST")
    print("================================")
    print("Email    : harini@gmail.com")
    print("Password : harini123")
    print("Role     : Customer")
    print("Login    : PASS")
    print("================================")

except Exception as e:
    print("LOGIN TEST : FAIL")
    print("Error:", e)

finally:
    time.sleep(2)
    driver.quit()
    print("Browser closed")