/* eslint-disable react/prop-types */
import React, { Component } from "react"
import { connect } from "react-redux"
import PropTypes from "prop-types"
import { omit } from "lodash"
import { withRouter } from "react-router"

import queryString from "query-string"

import TablePagination from "@material-ui/core/TablePagination"
import { withStyles } from "@material-ui/core/styles"

import YaxysClue, { queries } from "../services/YaxysClue.js"
import { withConstants } from "../services/Utils.js"

import ModelTable from "./ModelTable.jsx"
import Loader from "./Loader.jsx"

@withRouter
@withConstants
export default class ModelTableLoader extends Component {
  static propTypes = {
    identity: PropTypes.string.isRequired,
    limit: PropTypes.number,
    additionalClueProperties: PropTypes.object,
    columns: PropTypes.arrayOf(PropTypes.string),
    onCellClick: PropTypes.func,
    url: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    onDelete: PropTypes.func,
    deletedHash: PropTypes.object,
    searchFields: PropTypes.object,
    deletedKey: PropTypes.string,
  }

  onChangePage = (event, page) => {
    this.props.history.push({ search: `page=${page + 1}` })
  }

  render() {
    const page = queryString.parse(this.props.history.location.search)?.page - 1 || 0
    const keyword = queryString.parse(this.props.history.location.search)?.filter
    return (
      <ModelTableLoaderPage
        page={page}
        keyword={keyword}
        onChangePage={this.onChangePage}
        limit={this.props.limit || this.props.constants.settings.paginationLimit}
        {...omit(this.props, "limit", "staticContext")}
      />
    )
  }
}

const modelClue = props => ({
  identity: props.identity.toLowerCase(),
  query: queries.FIND,
  sort: { id: 1 },
  limit: props.limit,
  skip: props.page * props.limit,
  filter: props.filter,
  ...props.additionalClueProperties,
})
const modelSelector = YaxysClue.selectors.byClue(modelClue)

@withConstants
@connect(
  (state, props) => ({
    models: modelSelector(state, props),
  }),
  {
    loadModels: YaxysClue.actions.byClue,
  }
)
@withStyles(props => ({
  paginationSpacer: {
    display: "none",
  },
}))
class ModelTableLoaderPage extends Component {
  static propTypes = {
    identity: PropTypes.string.isRequired,
    limit: PropTypes.number,
    additionalClueProperties: PropTypes.object,
    columns: PropTypes.arrayOf(PropTypes.string),
    onCellClick: PropTypes.func,
    url: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    deletedHash: PropTypes.object,
    deletedKey: PropTypes.string,
    page: PropTypes.number,
    searchFields: PropTypes.object,
    keyword: PropTypes.string,
    onChangePage: PropTypes.func,
  }

  componentDidMount() {
    const filter = {filterKeys:this.props.searchFields, filterValue: this.props.keyword}
    this.props.loadModels(modelClue({ ...this.props }), { force: true })
  }

  componentDidUpdate(prevProps) {
    if (this.props.page !== prevProps.page || (this.props.searchFields && this.props.keyword !== prevProps.keyword)) {
      const filter = {filterKeys:this.props.searchFields, filterValue: this.props.keyword}
      this.props.loadModels(modelClue({ ...this.props, filter }), { force: true })
      console.log(this.props.models?.data);
    }
  }

  render() {
    const { classes, identity, models, page, limit, constants, onChangePage } = this.props
    const meta = models?.meta?.responseMeta?.meta && JSON.parse(models.meta.responseMeta.meta)
    return (
      <Loader item={models}>
        <ModelTable
          schema={constants.schemas[identity]}
          data={models?.data || []}
          {...omit(
            this.props,
            "identity",
            "limit",
            "additionalClueProperties",
            "page",
            "onChangePage",
            "loadModels"
          )}
        />
        {meta?.total > limit ? (
          <TablePagination
            classes={{
              spacer: classes.paginationSpacer,
            }}
            count={Number(JSON.parse(models.meta.responseMeta.meta).total)}
            rowsPerPage={limit}
            rowsPerPageOptions={[]}
            page={page}
            onChangePage={onChangePage}
            component="div"
          />
        ) : false}
      </Loader>
    )
  }
}
