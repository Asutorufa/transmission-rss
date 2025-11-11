'use client';

import { Autocomplete, AutocompleteItem, Button, Card, CardBody, CardFooter, CardHeader, Chip, DatePicker, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Popover, PopoverContent, PopoverTrigger, Spinner, Switch, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Textarea, Tooltip, useDisclosure } from "@heroui/react";
import { fromDate, getLocalTimeZone, ZonedDateTime } from "@internationalized/date";
import path from "path";
import { useState } from "react";
import useSWR from "swr";
import { DeleteIcon, EditIcon, PlusIcon } from "./icons";

type Status = {
  running: boolean;
}

type RSS = {
  disabled: boolean;
  name: string;
  url: string;
  download_dir: string;
  internal?: number;
  regexp?: string[];
  exclude_regexp?: string[];
  download_after?: number;
  expire_time?: number;
  fetch_interval?: number;
  label?: string[];
}

const emptyConfig: RSS = {
  disabled: true,
  name: "",
  url: "",
  download_dir: "",
}

// const baseUrl = "http://localhost:9093";
const baseUrl = "";
const configUrl = `${baseUrl}/api/v1/config`;
const StartJobUrl = `${baseUrl}/start_job`;
const StatusUrl = `${baseUrl}/api/v1/status`;

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isPopoverOpen, setIsPopoverOpen] = useState<{ [key: number]: boolean }>({});
  const [newRegexp, setNewRegexp] = useState("");
  const [newExcludeRegexp, setNewExcludeRegexp] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [originalConfig, setOriginalConfig] = useState<RSS>(emptyConfig)
  const [config, setConfig] = useState<RSS>(emptyConfig);
  const [configIndex, setConfigIndex] = useState(0);
  const [isNew, setIsNew] = useState(false);


  const { data, error, mutate } = useSWR(configUrl, async (url) => {
    const res = await fetch(url);
    return await res.json() as RSS[];
  })

  const { data: status, mutate: mutateStatus } = useSWR(StatusUrl, async (url) => {
    const res = await fetch(url);
    return await res.json() as Status;
  }, { refreshInterval: 5000 })



  if (error) return <div style={{ position: "absolute", top: "50%", left: "50%" }}>failed to load</div>
  if (!data) return <Spinner style={{ position: "absolute", top: "50%", left: "50%" }} />

  const saveRss = async (rss: RSS) => {
    if (!rss.name || !rss.url || !rss.download_dir) return;

    setSaving(true);
    let res;

    try {
      if (isNew) {
        console.log(JSON.stringify(rss, null, "  "));
        res = await fetch(configUrl, {
          method: "PUT",
          body: JSON.stringify(rss)
        })
      } else {
        res = await fetch(configUrl, {
          method: "PATCH",
          body: JSON.stringify({
            index: configIndex,
            config: rss,
            original: originalConfig
          })
        })
      }


      if (!res.ok) {
        console.error(await res.text());
      }

    } catch (e) {
      console.error(e);
    }

    mutate();
    setSaving(false);
    onClose();
  }

  const deleteRss = async (index: number, config: RSS) => {
    try {
      const resp = await fetch(configUrl, {
        method: "DELETE",
        body: JSON.stringify({
          index: index,
          config: config
        })
      })

      if (!resp.ok) {
        console.error(await resp.text());
      }
    } catch (e) {
      console.error(e);
    }

    mutate();
  }

  const openModal = (index: number, config: RSS, isNew = false) => {
    setConfigIndex(index);
    setConfig(config);
    setOriginalConfig(config);
    setIsNew(isNew);
    onOpen();
  }

  return (<>
    <div className="p-2">
      <Modal
        backdrop="blur"
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{config.name}</ModalHeader>
              <ModalBody>
                <Switch
                  isSelected={config.disabled}
                  onChange={(e) => {
                    setConfig({ ...config, disabled: e.target.checked });
                  }}
                >
                  Disabled
                </Switch>
                {isNew &&
                  <Textarea
                    value={config.name}
                    isInvalid={!config.name}
                    errorMessage="Name is required"
                    isRequired
                    label="Name"
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  />
                }
                <Textarea
                  isRequired
                  isInvalid={!config.url}
                  errorMessage="Url is required"
                  value={config.url}
                  label="Url"
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                />
                <Autocomplete
                  isRequired
                  allowsCustomValue
                  isInvalid={!config.download_dir}
                  inputValue={config.download_dir}
                  label="Download Dir"
                  onInputChange={(e) => setConfig({ ...config, download_dir: e })}
                >
                  {[...new Set(data.map((rss) => path.basename(rss.download_dir).includes("Season ") ? path.dirname(path.dirname(rss.download_dir)) : path.dirname(rss.download_dir)))].map((value) => (
                    <AutocompleteItem key={value}>
                      {value}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>

                <Card style={{ overflow: "visible" }}>
                  <CardHeader>Regexp</CardHeader>
                  <CardBody>
                    {
                      (!config.regexp || config.regexp.length === 0) && (
                        <div className="text-gray-400 text-center">Empty</div>
                      )
                    }
                    {
                      config.regexp?.map((r, i) => {
                        return <div key={i}>
                          <Input
                            className={i === 0 ? "" : "mt-2"}
                            value={r}
                            onChange={(e) => {
                              const regexp = config.regexp ? [...config.regexp] : [];
                              regexp[i] = e.target.value;
                              setConfig({ ...config, regexp });
                            }}
                            endContent={
                              <button
                                className="focus:outline-hidden"
                                onClick={() => {
                                  const regexp = config.regexp ? [...config.regexp] : [];
                                  regexp.splice(i, 1);
                                  setConfig({ ...config, regexp });
                                }}
                              >
                                <span className="text-lg text-danger cursor-pointer active:opacity-50">
                                  <DeleteIcon />
                                </span>
                              </button>
                            }
                          />
                        </div>
                      })
                    }
                  </CardBody>
                  <CardFooter>
                    <Input
                      value={newRegexp}
                      onChange={(e) => setNewRegexp(e.target.value)}
                      endContent={
                        <button
                          className="focus:outline-hidden"
                          onClick={() => {
                            if (!newRegexp) return;
                            const regexp = config.regexp ? [...config.regexp] : [];
                            regexp.push(newRegexp);
                            setConfig({ ...config, regexp });
                          }}
                        >
                          <PlusIcon />
                        </button>
                      }
                    />
                  </CardFooter>
                </Card>
                <Card style={{ overflow: "visible" }}>
                  <CardHeader>Exclude Regexp</CardHeader>
                  <CardBody>
                    {
                      (!config.exclude_regexp || config.exclude_regexp.length === 0) && (
                        <div className="text-gray-400 text-center">Empty</div>
                      )
                    }
                    {
                      config.exclude_regexp?.map((r, i) => {
                        return <div key={i}>
                          <Input
                            className={i === 0 ? "" : "mt-2"}
                            value={r}
                            onChange={(e) => {
                              const regexp = config.exclude_regexp ? [...config.exclude_regexp] : [];
                              regexp[i] = e.target.value;
                              setConfig({ ...config, exclude_regexp: regexp });
                            }}
                            endContent={
                              <button
                                className="focus:outline-hidden"
                                onClick={() => {
                                  const regexp = config.exclude_regexp ? [...config.exclude_regexp] : [];
                                  regexp.splice(i, 1);
                                  setConfig({ ...config, exclude_regexp: regexp });
                                }}
                              >
                                <span className="text-lg text-danger cursor-pointer active:opacity-50">
                                  <DeleteIcon />
                                </span>
                              </button>
                            }
                          />
                        </div>
                      })
                    }
                  </CardBody>
                  <CardFooter>
                    <Input
                      value={newExcludeRegexp}
                      onChange={(e) => setNewExcludeRegexp(e.target.value)}
                      endContent={
                        <button
                          className="focus:outline-hidden"
                          onClick={() => {
                            if (!newExcludeRegexp) return;
                            const regexp = config.exclude_regexp ? [...config.exclude_regexp] : [];
                            regexp.push(newExcludeRegexp);
                            setConfig({ ...config, exclude_regexp: regexp });
                          }}
                        >
                          <PlusIcon />
                        </button>
                      }
                    />
                  </CardFooter>
                </Card>
                <Input
                  type="number"
                  value={(config.fetch_interval) ? config.fetch_interval.toString() : ""}
                  label="Interval"
                  onChange={(e) => {
                    const interval = Number(e.target.value);
                    if (isNaN(interval)) setConfig({ ...config, fetch_interval: undefined });
                    else setConfig({ ...config, fetch_interval: interval })
                  }}
                />
                <Card style={{ overflow: "visible" }}>
                  <CardHeader>Label</CardHeader>
                  <CardBody>
                    {
                      (!config.label || config.label.length === 0) && (
                        <div className="text-gray-400 text-center">Empty</div>
                      )
                    }
                    {
                      config.label?.map((r, i) => {
                        return <div key={i}>
                          <Input
                            className={i === 0 ? "" : "mt-2"}
                            value={r}
                            onChange={(e) => {
                              const label = config.label ? [...config.label] : [];
                              label[i] = e.target.value;
                              setConfig({ ...config, label });
                            }}
                            endContent={
                              <button
                                className="focus:outline-hidden"
                                onClick={() => {
                                  const label = config.label ? [...config.label] : [];
                                  label.splice(i, 1);
                                  setConfig({ ...config, label });
                                }}
                              >
                                <span className="text-lg text-danger cursor-pointer active:opacity-50">
                                  <DeleteIcon />
                                </span>
                              </button>
                            }
                          />
                        </div>
                      })
                    }
                  </CardBody>
                  <CardFooter>
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      endContent={
                        <button
                          className="focus:outline-hidden"
                          onClick={() => {
                            if (!newLabel) return;
                            const label = config.label ? [...config.label] : [];
                            label.push(newLabel);
                            setConfig({ ...config, label });
                          }}
                        >
                          <PlusIcon />
                        </button>
                      }
                    />
                  </CardFooter>
                </Card>
                <DatePicker
                  label="Download After"
                  inert={false}
                  hideTimeZone
                  showMonthAndYearPickers
                  value={config.download_after ? fromDate(new Date(config.download_after * 1000), getLocalTimeZone()) : undefined}
                  onChange={(e: ZonedDateTime | null) => setConfig({ ...config, download_after: e ? e.toDate().getTime() / 1000 : undefined })}
                />
                <DatePicker
                  inert={false}
                  label="Expire Time"
                  hideTimeZone
                  showMonthAndYearPickers
                  value={config.expire_time ? fromDate(new Date(config.expire_time * 1000), getLocalTimeZone()) : undefined}
                  onChange={(e: ZonedDateTime | null) => setConfig({ ...config, expire_time: e ? e.toDate().getTime() / 1000 : undefined })}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button color="primary" variant="bordered" isLoading={saving} onPress={() => saveRss(config)}>
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>



      <Table
        aria-label="RSS Table"
        removeWrapper
        selectionMode="none"
        isStriped
        isHeaderSticky
        topContent={
          <div className="flex flex-col gap-4">
            <div className="flex justify-end gap-3 items-end">
              <Button color={status?.running ? "success" : "secondary"} variant="flat">{status?.running ? "Running" : "Waiting"}</Button>
              <Button
                isLoading={status?.running}
                color="primary"
                variant="flat"
                onPress={async () => {
                  try {
                    const resp = await fetch(StartJobUrl)
                    if (!resp.ok) {
                      console.error(await resp.text())
                    }
                  } catch (e) {
                    console.error(e)
                  }

                  mutateStatus()
                }}
              >
                Start Job
              </Button>
              <Button
                color="primary"
                variant="flat"
                endContent={<PlusIcon />}
                onPress={() => { openModal(-1, emptyConfig, true) }}
              >
                Add New
              </Button>
            </div>
          </div>
        }
      >
        <TableHeader>
          <TableColumn>#</TableColumn>
          <TableColumn>Name</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody>

          {
            data.map((rss, i) => {
              return <TableRow key={i}>
                <TableCell>{i}</TableCell>
                <TableCell>{rss.name}</TableCell>
                <TableCell>
                  <Chip className="capitalize" color={rss.disabled ? "danger" : "success"} size="sm" variant="flat">
                    {rss.disabled ? "Disabled" : "Enabled"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="relative flex items-center gap-2">


                    <Tooltip content="Edit">
                      <span className="text-lg text-default-400 cursor-pointer active:opacity-50" onClick={() => { openModal(i, rss); }}>
                        <EditIcon />
                      </span>
                    </Tooltip>

                    <Popover placement="bottom" backdrop="blur" className="w-[300px]" isOpen={isPopoverOpen[i]} onOpenChange={(open) => setIsPopoverOpen({ ...isPopoverOpen, [i]: open })}>
                      <PopoverTrigger>
                        <span className="text-lg text-danger cursor-pointer active:opacity-50">
                          <DeleteIcon />
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="p-1">
                        <Card shadow="none" className="max-w-[300px] border-none bg-transparent">
                          <CardHeader><p className="text-default-500">Are you sure you want to delete</p></CardHeader>
                          <CardBody className="justify-center items-center">
                            <p className="text-default-600">{rss.name}</p>
                          </CardBody>
                          <CardFooter className="justify-between">
                            <Button color="default" variant="bordered" size="sm" onPress={() => { setIsPopoverOpen({ ...isPopoverOpen, [i]: false }) }}>Cancel</Button>
                            <Button color="danger" variant="bordered" size="sm" onPress={() => {
                              deleteRss(i, rss)
                              setIsPopoverOpen({ ...isPopoverOpen, [i]: false })
                            }}>Delete</Button>
                          </CardFooter>
                        </Card>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
              </TableRow>
            })
          }
        </TableBody>
      </Table>
    </div>
  </>);
}
