print('KARA PIZZA JOINT')
print('MENU')
print('Regular')
print('sizes available:small,medium,large')
order=(input('Please enter pizza sizes_'))

if order=="small":
    print('$50')
elif order=="medium":
    print('$80')
elif order=="large":
    print('$120')

print('yes or no for options')

others=(input('Other preferences_'))

if others=="yes":
    print('Only pepperoni available') 
    size=(input('Please enter size_'))
    if size=="small":
        print('$20')
    elif size=="medium":
         print('$30')
    elif size=="large":
        print('$40')
    more=(input('Need extra cheese?_'))
    if more=="yes":
        print('$15')
    elif more=="no":
        print('Okay.Thank you')
        
print('Enjoy every bite')