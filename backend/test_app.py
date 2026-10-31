import pytest
from app import Member, price

def test_single_year_returns_pension():
    # no mortality (shift = -1), age 109 -> only one payment, undiscounted
    pv, _ = price([Member(age=109, pension=1000)], 0.05, 0.02, -1)
    assert pv == pytest.approx(1000)

def test_two_payments_hand_calc():
    # age 108 -> two payments: 1000 + 1000 * 1.02 / 1.05
    # checks the function gives the same answer as that hand calculation
    pv, _ = price([Member(age=108, pension=1000)], 0.05, 0.02, -1)
    assert pv == pytest.approx(1000 + 1000 * 1.02 / 1.05)

def test_higher_discount_lowers_price():
    # 6% discount rate should give a lower price than 4%
    m = [Member(age=65, pension=10000)]
    assert price(m, 0.06, 0.03, 0)[0] < price(m, 0.04, 0.03, 0)[0]

def test_heavier_mortality_lowers_price():
    m = [Member(age=65, pension=10000)]
    assert price(m, 0.045, 0.03, 0.2)[0] < price(m, 0.045, 0.03, 0)[0]
    # if people die sooner, there are fewer payments so the price falls

def test_higher_inflation_raises_price():
    m = [Member(age=65, pension=10000)]
    assert price(m, 0.045, 0.04, 0)[0] > price(m, 0.045, 0.03, 0)[0]
    # bigger pension increases mean bigger payments so the price rises