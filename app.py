from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn import preprocessing
import csv
import re
import json
from datetime import datetime
import os

from extensions import db, login_manager
from models import User, Diagnosis

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key'  # Change this to a secure secret key
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///healthcare.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)

    # Custom template filter for JSON
    @app.template_filter('from_json')
    def from_json(value):
        return json.loads(value)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Create database tables
    with app.app_context():
        db.create_all()

    return app

app = create_app()

# Load and prepare data
training = pd.read_csv('Data/Training.csv')
testing = pd.read_csv('Data/Testing.csv')
cols = training.columns[:-1]
x = training[cols]
y = training['prognosis']

# Prepare label encoder
le = preprocessing.LabelEncoder()
le.fit(y)
y = le.transform(y)

# Train model
x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.33, random_state=42)
clf = DecisionTreeClassifier()
clf.fit(x_train, y_train)

# Load additional data
description_list = {}
severityDictionary = {}
precautionDictionary = {}

def load_data():
    # Load symptom descriptions
    with open('MasterData/symptom_Description.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            description_list[row[0]] = row[1]

    # Load severity dictionary
    with open('MasterData/symptom_severity.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            try:
                severityDictionary[row[0]] = int(row[1])
            except:
                pass

    # Load precaution dictionary
    with open('MasterData/symptom_precaution.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            precautionDictionary[row[0]] = [row[1], row[2], row[3], row[4]]

def check_pattern(dis_list, inp):
    pred_list = []
    inp = inp.replace(' ', '_')
    patt = f"{inp}"
    regexp = re.compile(patt)
    pred_list = [item for item in dis_list if regexp.search(item)]
    if len(pred_list) > 0:
        return 1, pred_list
    else:
        return 0, []

def get_followup_questions(symptom, user_info):
    # Get the most common symptoms that appear together with the given symptom
    symptom_combinations = {}
    
    # Create a mask for rows where the symptom is present
    mask = training[symptom] == 1
    
    # Get the filtered data
    filtered_data = training[mask]
    
    # Count occurrences of other symptoms
    for col in cols:
        if col != symptom:
            count = filtered_data[col].sum()
            if count > 0:
                symptom_combinations[col] = count
    
    # Sort by frequency and get top 5
    sorted_symptoms = sorted(symptom_combinations.items(), key=lambda x: x[1], reverse=True)
    followup_symptoms = [symptom for symptom, _ in sorted_symptoms[:5]]
    
    # Filter out menstruation-related symptoms for male users
    gender = user_info.get('gender', '').lower()
    if gender == 'male':
        followup_symptoms = [sym for sym in followup_symptoms if not any(
            kw in sym.lower() for kw in ['menstruation', 'menstrual', 'period']
        )]
    
    # Generate questions based on symptoms and user info
    questions = []
    for sym in followup_symptoms:
        if gender == 'female' and 'menstrual' in sym.lower():
            questions.append(f"Are you experiencing {sym}? (This is important for female patients)")
        elif user_info.get('age') and int(user_info.get('age', 0)) > 50 and 'joint' in sym.lower():
            questions.append(f"Are you experiencing {sym}? (This is common in older patients)")
        else:
            questions.append(f"Are you experiencing {sym}?")
    
    return questions

def sec_predict(symptoms_exp):
    df = pd.read_csv('Data/Training.csv')
    X = df.iloc[:, :-1]
    y = df['prognosis']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=20)
    rf_clf = DecisionTreeClassifier()
    rf_clf.fit(X_train, y_train)

    symptoms_dict = {symptom: index for index, symptom in enumerate(X)}
    input_vector = np.zeros(len(symptoms_dict))
    for item in symptoms_exp:
        input_vector[symptoms_dict[item]] = 1

    return rf_clf.predict([input_vector])

def get_severity_level(score):
    if score > 20:
        return "high", "You should seek immediate medical attention."
    elif score > 13:
        return "medium", "You should consult a doctor soon."
    else:
        return "low", "You can try home remedies, but monitor your condition."

def calc_condition(exp, days):
    sum = 0
    for item in exp:
        sum += severityDictionary.get(item, 0)
    score = (sum * days) / (len(exp) + 1)
    severity_level, advice = get_severity_level(score)
    return {
        "score": score,
        "level": severity_level,
        "advice": advice
    }

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html')

@app.route('/profile')
@login_required
def profile():
    diagnoses = Diagnosis.query.filter_by(user_id=current_user.id).order_by(Diagnosis.timestamp.desc()).all()
    return render_template('profile.html', diagnoses=diagnoses)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        gender = request.form.get('gender')
        age = request.form.get('age')

        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'danger')
            return redirect(url_for('register'))

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
            gender=gender,
            age=age
        )
        db.session.add(user)
        db.session.commit()

        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()

        if not user:
            flash('User not registered. Please register first!', 'warning')
            return redirect(url_for('register'))
        
        if check_password_hash(user.password_hash, password):
            login_user(user)
            flash('Logged in successfully!', 'success')
            return redirect(url_for('chat'))
        else:
            flash('Invalid password. Please try again.', 'danger')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully', 'success')
    return redirect(url_for('login'))

@app.route('/get_symptoms', methods=['POST'])
@login_required
def get_symptoms():
    data = request.get_json()
    symptom = data.get('symptom', '').lower()
    
    # Get all symptoms from training data
    all_symptoms = list(training.columns[:-1])  # Exclude the prognosis column
    
    # Find matching symptoms
    matches = []
    for sym in all_symptoms:
        if symptom in sym.lower() or sym.lower() in symptom:
            matches.append(sym)
    
    # If no exact matches, try partial matches
    if not matches:
        for sym in all_symptoms:
            sym_words = sym.lower().replace('_', ' ').split()
            input_words = symptom.split()
            if any(word in sym_words for word in input_words):
                matches.append(sym)
    
    # Remove duplicates and sort
    matches = sorted(list(set(matches)))
    
    return jsonify({
        'status': 'success',
        'matches': matches[:5]  # Return top 5 matches
    })

@app.route('/get_followup_questions', methods=['POST'])
@login_required
def get_followup_questions():
    data = request.get_json()
    symptom = data.get('symptom')
    
    # Get the most common symptoms that appear together with the given symptom
    symptom_combinations = {}
    
    # Create a mask for rows where the symptom is present
    mask = training[symptom] == 1
    
    # Get the filtered data
    filtered_data = training[mask]
    
    # Count occurrences of other symptoms
    for col in cols:
        if col != symptom:
            count = filtered_data[col].sum()
            if count > 0:
                symptom_combinations[col] = count
    
    # Sort by frequency and get top 5
    sorted_symptoms = sorted(symptom_combinations.items(), key=lambda x: x[1], reverse=True)
    followup_symptoms = [symptom for symptom, _ in sorted_symptoms[:5]]
    
    # Filter out menstruation-related symptoms for male users
    if current_user.gender.lower() == 'male':
        followup_symptoms = [sym for sym in followup_symptoms if not any(
            kw in sym.lower() for kw in ['menstruation', 'menstrual', 'period']
        )]
    
    # Generate questions based on symptoms and user info
    questions = []
    for sym in followup_symptoms:
        if current_user.gender.lower() == 'female' and 'menstrual' in sym.lower():
            questions.append(f"Are you experiencing {sym}? (This is important for female patients)")
        elif current_user.age and int(current_user.age) > 50 and 'joint' in sym.lower():
            questions.append(f"Are you experiencing {sym}? (This is common in older patients)")
        else:
            questions.append(f"Are you experiencing {sym}?")
    
    return jsonify({
        'status': 'success',
        'questions': questions
    })

@app.route('/predict', methods=['POST'])
@login_required
def predict():
    data = request.get_json()
    symptoms = data.get('symptoms', [])
    days = data.get('days', 0)
    
    if not symptoms:
        return jsonify({
            'status': 'error',
            'message': 'No symptoms provided'
        })
    
    # Get prediction
    prediction = sec_predict(symptoms)[0]
    confidence = clf.score(x_test, y_test)
    
    # Calculate severity
    severity = calc_condition(symptoms, days)
    
    # Save diagnosis to database
    diagnosis = Diagnosis(
        user_id=current_user.id,
        symptoms=json.dumps(symptoms),
        prediction=prediction,
        severity=severity['level'],
        confidence=confidence
    )
    db.session.add(diagnosis)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'prediction': prediction,
        'confidence': confidence,
        'severity': severity,
        'description': description_list.get(prediction, ''),
        'precautions': precautionDictionary.get(prediction, [])
    })

@app.route('/access_db')
def access_db():
    return jsonify({
        'database_uri': app.config['SQLALCHEMY_DATABASE_URI'],
        'user': 'your_db_user',
        'password': 'your_db_password'
    })

if __name__ == '__main__':
    load_data()
    app.run(debug=True) 