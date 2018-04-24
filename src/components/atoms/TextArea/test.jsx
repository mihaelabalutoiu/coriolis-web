/*
Copyright (C) 2018  Cloudbase Solutions SRL
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.
You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// @flow

import React from 'react'
import { shallow } from 'enzyme'
import sinon from 'sinon'
import TextArea from '.'

const wrap = props => shallow(<TextArea {...props} />)

describe('TextArea Component', () => {
  it('dispatches change', () => {
    const onChange = sinon.spy()
    const wrapper = wrap({ value: 'the_value', onChange })
    expect(wrapper.prop('value')).toBe('the_value')
    wrapper.simulate('change', { value: 'A' })
    expect(onChange.args[0][0].value).toBe('A')
  })
})
