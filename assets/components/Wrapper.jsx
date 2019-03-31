import React, { Component, Fragment } from "react"
import PropTypes from "prop-types"
import { connect } from "react-redux"

import { withStyles } from "@material-ui/core/styles"
import { Link } from "react-router-dom"
import { withRouter } from "react-router"

import LoginDialog from "./LoginDialog.jsx"
import Breadcrumbs from "../components/Breadcrumbs.jsx"
import LanguageSelector from "./LanguageSelector.jsx"

import classNames from "classnames"
import Drawer from "@material-ui/core/Drawer"
import AppBar from "@material-ui/core/AppBar"
import Toolbar from "@material-ui/core/Toolbar"
import List from "@material-ui/core/List"
import Divider from "@material-ui/core/Divider"
import IconButton from "@material-ui/core/IconButton"
import MenuIcon from "@material-ui/icons/Menu"
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft"
import ListItem from "@material-ui/core/ListItem"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import ListItemText from "@material-ui/core/ListItemText"
import SdCardIcon from "@material-ui/icons/SdCard"
import PersonIcon from "@material-ui/icons/Person"
import PeopleOutlineIcon from "@material-ui/icons/PeopleOutline"
import PersonOutlineIcon from "@material-ui/icons/PersonOutline"
import MeetingRoomIcon from "@material-ui/icons/MeetingRoom"
import PictureInPictureIcon from "@material-ui/icons/PictureInPicture"
import SettingsIcon from "@material-ui/icons/Settings"
import Avatar from "@material-ui/core/Avatar"

import { meSelector } from "../services/Me"
import { withNamespaces } from "react-i18next"
import { withConstants } from "../services/Utils"

const drawerWidth = 240
const lists = {
  people: [
    {
      icon: PersonOutlineIcon,
      title: "USER_PLURAL",
      url: "/users",
    },
    {
      icon: PeopleOutlineIcon,
      title: "USER_PROFILE_PLURAL",
      url: "/user-profiles",
    },
  ],
  hardware: [
    {
      icon: SdCardIcon,
      title: "AP_PLURAL",
      url: "/access-points",
    },
    {
      icon: MeetingRoomIcon,
      title: "DOOR_PLURAL",
      url: "/doors",
      isHidden: settings => settings?.hideDoors,
    },
    {
      icon: PictureInPictureIcon,
      title: "ZONE_PLURAL",
      url: "/zones",
      isHidden: settings => settings?.hideZones,
    },
  ],
  adminZone: [
    {
      icon: PersonIcon,
      title: "OPERATOR_PLURAL",
      url: "/operators",
    },
    {
      icon: SettingsIcon,
      title: "SETTINGS_PAGE.HEADER",
      url: "/settings",
    },
  ],
}

const styles = theme => ({
  root: {
    display: "flex",
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  menuButtonHidden: {
    display: "none",
  },
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing.unit * 7,
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing.unit * 9,
    },
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    height: "100vh",
    overflow: "auto",
  },
  chartContainer: {
    marginLeft: -22,
  },
  tableContainer: {
    height: 320,
  },
  avatar: {
    margin: 10,
  },
  authLogin: {
    cursor: "pointer",
  },
  authLoginSpan: {
    float: "right",
    lineHeight: "66px",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 600,
  },
  authMe: {
    color: "white",
    fontWeight: 600,
    fontSize: 16,
  },
  drawerItem: {
    color: "rgba(0, 0, 0, 0.54)",
  },
  drawerItemSelected: {
    backgroundColor: `${theme.palette.primary.main} !important`,
    color: "white !important",
    fontWeight: 600,
  },
  drawerItemInheritColor: {
    color: "inherit !important",
    fontWeight: "inherit !important",
  },
  bottom: {
    position: "fixed",
    bottom: 0,
    right: 0,
    left: drawerWidth,
    transition: theme.transitions.create("left", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    zIndex: 100,
  },
  bottomClosed: {
    left: theme.spacing.unit * 7,
    [theme.breakpoints.up("sm")]: {
      left: theme.spacing.unit * 9,
    },
    transition: theme.transitions.create("left", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  bottomSpacer: {
    height: 50,
  },
})

@withRouter
@withStyles(styles)
@withNamespaces()
@withConstants
@connect((state, props) => ({
  me: meSelector(state),
}))
export default class Wrapper extends Component {
  static propTypes = {
    me: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    location: PropTypes.object,
    bottom: PropTypes.object,
    breadcrumbs: PropTypes.array,
    isBreadcrumbsRoot: PropTypes.bool,
    t: PropTypes.func,
    constants: PropTypes.object,
  }

  state = {
    open: !localStorage.getItem("isDrawerClosed"),
    loginOpen: false,
  }

  handleDrawerOpen = () => {
    localStorage.removeItem("isDrawerClosed")
    this.setState({ open: true })
  }

  handleDrawerClose = () => {
    localStorage.setItem("isDrawerClosed", "true")
    this.setState({ open: false })
  }

  onCloseLoginDialog = () => {
    this.setState({ loginOpen: false })
  }

  openLoginDialog = () => {
    this.setState({ loginOpen: true })
  }

  renderAuth() {
    const { classes, t } = this.props
    if (this.props.me) {
      return (
        <Link to="/me" className={classes.authMe}>
          { this.props.me.name || this.props.me.login || this.props.me.email}
        </Link>
      )
    }
    return (
      <div className={classes.authLogin} onClick={this.openLoginDialog}>
        <span className={classes.authLoginSpan}>{t("LOGIN_FORM.BUTTON")}</span>
        <Avatar className={classes.avatar}>
          <PersonIcon />
        </Avatar>
      </div>
    )
  }

  renderList(key) {
    const { classes, location, t, constants } = this.props
    const url = location.pathname
    return (
      <List>
        {lists[key].map((item, index) => {
          if (item.isHidden?.(constants.settings)) { return false }
          return (
            <Link to={item.url} key={index}>
              <ListItem
                button
                selected={
                  item.url === "/" ? url === item.url : url.indexOf(item.url.toLowerCase()) === 0
                }
                classes={{ root: classes.drawerItem, selected: classes.drawerItemSelected }}
              >
                <ListItemIcon classes={{ root: classes.drawerItemInheritColor }}>
                  {React.createElement(item.icon)}
                </ListItemIcon>
                <ListItemText
                  classes={{ primary: classes.drawerItemInheritColor }}
                  primary={t(item.title)}
                />
              </ListItem>
            </Link>
          )
        })}
      </List>
    )
  }

  renderBottom() {
    const { classes, bottom } = this.props
    if (!bottom) {
      return
    }
    return (
      <Fragment>
        <div className={classes.bottomSpacer} />
        <div className={classNames(classes.bottom, !this.state.open && classes.bottomClosed)}>
          {bottom}
        </div>
      </Fragment>
    )
  }

  render() {
    const { classes } = this.props
    return (
      <div className={classes.root}>
        <AppBar
          position="absolute"
          className={classNames(classes.appBar, this.state.open && classes.appBarShift)}
        >
          <Toolbar disableGutters={!this.state.open} className={classes.toolbar}>
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              onClick={this.handleDrawerOpen}
              className={classNames(
                classes.menuButton,
                this.state.open && classes.menuButtonHidden
              )}
            >
              <MenuIcon />
            </IconButton>
              <Breadcrumbs
                isRoot={ this.props.isBreadcrumbsRoot }
                items={ this.props.breadcrumbs }
              />
            <LanguageSelector />
            {this.renderAuth()}
            <LoginDialog open={this.state.loginOpen} onClose={this.onCloseLoginDialog} />
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          classes={{
            paper: classNames(classes.drawerPaper, !this.state.open && classes.drawerPaperClose),
          }}
          open={this.state.open}
        >
          <div className={classes.toolbarIcon}>
            <IconButton onClick={this.handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
          <Divider />
          {this.renderList("people")}
          <Divider />
          {this.renderList("hardware")}
          <Divider />
          {this.renderList("adminZone")}
        </Drawer>
        <main className={classes.content}>
          <div className={classes.appBarSpacer} />
          {this.props.children}
          {this.renderBottom()}
        </main>
      </div>
    )
  }
}
