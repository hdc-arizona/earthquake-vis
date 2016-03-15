from flask_wtf import Form
from wtforms import (
    TextField, ValidationError, validators, SubmitField
)
from flask_wtf.file import FileField, FileRequired
from server import eqs


def validate_id(form, field):
        if (field.data in eqs):
            raise ValidationError('ID already exist')


class NewSimulationDataForm(Form):
    id = TextField('ID', validators=[validate_id, validators.InputRequired()])
    file = FileField('Earthquake Accelaration File:',
                     validators=[FileRequired()])
    submit = SubmitField("Add")
