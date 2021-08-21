/* eslint-disable react/prop-types */
import React, { Component } from "react"
import { Link } from "react-router-dom"
import { connect } from "react-redux"

import Paper from "@material-ui/core/Paper"
import Button from "@material-ui/core/Button"
import TextField from '@material-ui/core/TextField'

import YaxysClue, { queries } from "../services/YaxysClue"
import { withConstants } from "../services/Utils"
import queryString from "query-string"

import Wrapper from "../components/Wrapper.jsx"
import Created from "../components/Created.jsx"
import ModelDialog from "../components/ModelDialog.jsx"
import ModelTableLoader from "../components/ModelTableLoader.jsx"
import Request from "../components/Request.jsx"
import { withNamespaces } from "react-i18next"

const CREATED_USERS_MARKER = "users-page"
const createdUsersSelector = YaxysClue.selectors.byClue(
  props => ({ identity: "user", query: queries.CREATE }),
  { marker: CREATED_USERS_MARKER }
)

@withConstants
@withNamespaces()
@connect(
  (state, props) => ({
    createdUsers: createdUsersSelector(state, props),
  }),
  {
    createUser: YaxysClue.actions.byClue,
    deleteUser: YaxysClue.actions.byClue,
  }
)
export default class Users extends Component {
  state = {
    addOpen: false,
    deletedHash: {},
    constructedAt: new Date().getTime(),
  }

  onAdd = event => {
    this.setState({ addOpen: true })
  }

  onAddClose = () => {
    this.setState({ addOpen: false })
  }

  onAddReady = values => {
    this.setState({ addOpen: false })

    this.props.createUser(
      {
        identity: "user",
        query: queries.CREATE,
        data: values,
      },
      { marker: CREATED_USERS_MARKER }
    )
  }

  onDeleteItem = item => {
    const { t } = this.props
    if (this.state.deletedHash[item.id]) {
      return
    }
    const entityInstance = t("ENTITY_INSTANCE", {
      entity: "$t(USER)",
      case: "ACCUSATIVE",
      info: {
        id: item.id,
        data: item,
      },
    })
    if (!confirm(`${t("ARE_YOU_SURE_TO")} ${t("DELETE").toLowerCase()} ${entityInstance}?`)) {
      return
    }

    this.props.deleteUser({
      identity: "user",
      query: queries.DELETE,
      id: item.id,
    })

    this.setState({
      deletedSelector: YaxysClue.selectors.byClue(
        props => ({ identity: "user", query: queries.DELETE, id: item.id })
      ),
      deleteAttemptAt: new Date().getTime(),
    })
  }

  onItemDeleted = item => {
    this.state.deletedHash[item?.meta?.clue?.id] = true
    this.forceUpdate()
  }

  render() {
    const { constants, t } = this.props
    const { settings, schemas } = constants
    return (
      <Wrapper breadcrumbs={[t("USER_PLURAL")]}>
        <h1 style={{ marginTop: 0 }}>{t("USER_PLURAL")}</h1>
        <p>
          {t("USERS_PAGE.PROFILES_DESC")}
          <Link to={"/user-profiles"}>{t("USERS_PAGE.PROFILES_DESC_LINK")}</Link>
        </p>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <Button
            variant="text"
            color="secondary"
            onClick={this.onAdd}
          >
            { `${t("CREATE")} ${t("USER", { "context": "ACCUSATIVE" })}`}
          </Button>
          <TextField
            label="Search"
            id="outlined-margin-dense"
            helperText=""
            margin="dense"
            defaultValue={queryString.parse(this.props.history.location.search)?.filter}
            variant="outlined"
            type="search"
            onChange={(e)=>this.props.history.push({ search: `filter=${e.target.value}` })}
          />
        </div>
        <Created
          items={this.props.createdUsers}
          content={user => `#${user.id} ${user.name}`}
          url={user => `/users/${user.id}`}
          laterThan={ this.state.constructedAt }
        />
        <Paper>
          <ModelTableLoader
            identity="user"
            url={user => `/users/${user.id}`}
            columns={[
              "id",
              "name",
              "hasCustomRights",
              "profiles",
              ...(settings.singleCredential ? ["credentialCode"] : []),
            ]}
            additionalClueProperties={{ populate: "profiles" }}
            onDelete={this.onDeleteItem}
            deletedHash={ this.state.deletedHash }
            deletedKey="id"
            searchFields={['name']}
          />
        </Paper>
        <br />
        <ModelDialog
          title={t("USERS_PAGE.CREATE_DLG_TITLE")}
          open={this.state.addOpen}
          onClose={this.onAddClose}
          onReady={this.onAddReady}
          schema={schemas.user}
          attributes={["name"]}
          btnReady={t("CREATE")}
        >
          {t("USERS_PAGE.CREATE_DLG_DESC")}
        </ModelDialog>
        <Request
          selector={this.state.deletedSelector}
          message={ `${t("DELETE_PROCESS")} ${t("DEFINITE_ARTICLE")} ${t("USER", { context: "GENITIVE" })}`}
          attemptAt={ this.state.deleteAttemptAt }
          onSuccess={ this.onItemDeleted }
        />
      </Wrapper>
    )
  }
}
