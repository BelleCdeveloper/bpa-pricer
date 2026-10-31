import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="BPA Pricer (illustrative)")

class Member(BaseModel):
    age: int = Field(ge=18, le=110)
    pension: float = Field(gt=0)
#define what data the API accepts , a list of members (age, pension) plus the discount rate, inflation and mortality shift 

class Request(BaseModel):
    members: list[Member]
    discount: float = 0.045
    inflation: float = 0.03
    mort_shift: float = 0.0

def qx(age, shift):
    return min(1.0, 0.00002 * np.exp(0.1 * age) * (1 + shift))

# made-up mortality function, chance of dying at each age

def price(members, discount, inflation, shift, max_age=110):
    cf = np.zeros(max_age)
    # creates a list of 110 zeros, each slot will hold the expected total pension payment in year t from today, across all members
    for m in members:
        surv = 1.0
        for t in range(max_age - m.age):
            cf[t] += m.pension * (1 + inflation) ** t * surv
            #pension year t increased by inflation each year
            #m.pension holds one member's annual pension amount in pounds; m.age is current age
            #gives expected payment weighted by the chance they are 
            #multiplied by inflation each year, weighted by the chance they are alive to receive it 
            surv *= 1 - qx(m.age + t, shift)
            #reduces survival for the next year if chance of dying at this age is q, survival drops by q
    pv = sum(c / (1 + discount) ** t for t, c in enumerate(cf))
    # sum all the expected cashflows across all members , each one discounted back to today's money 
    return pv, cf
# price calculation ; for each member it projects the pension each year, weights it by probability they are still alive, 
# then discounts it to a present value 

@app.get("/health")
def health():
    return {"status": "ok"}
# returns ok if the app is running 

@app.post("/price")
def price_endpoint(r: Request):
    pv, cf = price(r.members, r.discount, r.inflation, r.mort_shift)
    base = sum(m.pension for m in r.members)
    sens = {
        "discount +0.5%": price(r.members, r.discount + 0.005, r.inflation, r.mort_shift)[0],
        "inflation +0.5%": price(r.members, r.discount, r.inflation + 0.005, r.mort_shift)[0],
        "mortality -10%": price(r.members, r.discount, r.inflation, r.mort_shift - 0.1)[0],
    }
    return {"price": pv, "multiple_of_pension": pv / base,
            "cashflows": cf.tolist(), "sensitivities": sens}



# Endpoint that receives the member data, runs price and returns the results 


