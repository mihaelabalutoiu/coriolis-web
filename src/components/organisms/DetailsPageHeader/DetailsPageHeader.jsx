/*
Copyright (C) 2017  Cloudbase Solutions SRL
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

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import connectToStores from 'alt-utils/lib/connectToStores'

import { SideMenu, NotificationDropdown, UserDropdown } from 'components'

import NotificationActions from '../../../actions/NotificationActions'
import NotificationStore from '../../../stores/NotificationStore'

import backgroundImage from './images/star-bg.jpg'
import logoImage from './images/logo.svg'

const Wrapper = styled.div`
  display: flex;
  height: 64px;
  background: url('${backgroundImage}');
  align-items: center;
  padding: 0 22px;
  justify-content: space-between;
`
const Logo = styled.a`
  width: 240px;
  height: 48px;
  background: url('${logoImage}') no-repeat;
  cursor: pointer;
`
const UserDropdownStyled = styled(UserDropdown) `
  margin-left: 16px;
`
const Menu = styled.div`
  display: flex;
  align-items: center;
`
const User = styled.div`
  display: flex;
  align-items: center;
`

export class DetailsPageHeader extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    onUserItemClick: PropTypes.func,
    notificationStore: PropTypes.object,
  }

  static getStores() {
    return [NotificationStore]
  }

  static getPropsFromStores() {
    return {
      notificationStore: NotificationStore.getState(),
    }
  }

  componentDidMount() {
    NotificationActions.loadNotifications()
  }

  handleNotificationsClose() {
    NotificationActions.clearNotifications()
  }

  render() {
    return (
      <Wrapper>
        <Menu>
          <SideMenu />
          <Logo href="/#/replicas" />
        </Menu>
        <User>
          <NotificationDropdown white items={this.props.notificationStore.persistedNotifications} onClose={() => this.handleNotificationsClose()} />
          <UserDropdownStyled
            white
            user={this.props.user}
            onItemClick={this.props.onUserItemClick}
          />
        </User>
      </Wrapper>
    )
  }
}

export default connectToStores(DetailsPageHeader)
